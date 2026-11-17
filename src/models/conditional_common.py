"""Shared fold-local transforms and neural training primitives (no plotting)."""
import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.preprocessing import StandardScaler
from sklearn.base import BaseEstimator, RegressorMixin

def weights(groups, balanced=True):
    groups=np.asarray(groups)
    if not balanced:return np.ones(len(groups),dtype=np.float32)
    _,inv,n=np.unique(groups,return_inverse=True,return_counts=True)
    w=1/n[inv];return (w/w.mean()).astype(np.float32)

def interactions(x,enabled=True):
    d,s=x[:,:11],x[:,11:22]
    return np.concatenate([d,s,d*s,np.abs(d-s)],axis=1) if enabled else x[:,:22]

class FoldTransform:
    def fit(self,X,y):
        X=np.asarray(X);self.scaler=StandardScaler().fit(X[:,:22])
        self.t0=float(np.median(X[:,-1]));self.ts=float(np.subtract(*np.percentile(X[:,-1],[75,25]))) or 1.
        self.ym=float(np.mean(y));self.ys=max(float(np.std(y)),1e-8);return self
    def x(self,X):
        X=np.asarray(X,dtype=np.float32)
        if X.ndim!=2 or X.shape[1]!=23 or not np.isfinite(X).all():raise ValueError('Expected finite 23-column molecular descriptors and temperature')
        return np.column_stack([self.scaler.transform(X[:,:22]),(X[:,-1]-self.t0)/self.ts]).astype(np.float32)

def delta_examples(X,y,groups,pairs):
    # Average tied-temperature targets only for the auxiliary difference loss.
    f=pd.DataFrame({'pair':pairs,'group':groups,'t':X[:,-1],'y':y,'i':range(len(y))})
    a=[];b=[];target=[];pg=[];pc=[]
    for pair,c in f.groupby('pair',sort=True):
        q=c.groupby('t',sort=True).agg(y=('y','mean'),i=('i','first'))
        for j in range(len(q)-1):
            a.append(int(q.iloc[j].i));b.append(int(q.iloc[j+1].i));target.append(float(q.iloc[j+1].y-q.iloc[j].y));pg.append(c.group.iloc[0]);pc.append(pair)
    if not a:return np.array([],int),np.array([],int),np.array([],np.float32),np.array([],np.float32)
    wframe=pd.DataFrame({'g':pg,'c':pc});sizes=wframe.groupby('c').c.transform('size').to_numpy();ng=wframe.groupby('g').c.transform('nunique').to_numpy()
    w=1/(sizes*ng);w=w/w.mean()
    return np.array(a),np.array(b),np.array(target,np.float32),w.astype(np.float32)

class ConditionalNetwork(nn.Module):
    def __init__(self,width,dropout,structured,interaction,temperature):
        super().__init__();self.structured=structured;self.interaction=interaction;self.temperature=temperature
        def block(n,m):return nn.Sequential(nn.Linear(n,m),nn.SiLU(),nn.Dropout(dropout))
        if structured:
            self.drug=nn.Sequential(block(11,width),block(width,width//2));self.solvent=nn.Sequential(block(11,width),block(width,width//2))
            n=width*2 if interaction else width
            self.base=nn.Sequential(block(n,width),nn.Linear(width,1));self.slope=nn.Sequential(block(n,width//2),nn.Linear(width//2,1))
        else:self.plain=nn.Sequential(block(23,width),block(width,width),nn.Linear(width,1))
    def parts(self,x):
        if not self.structured:return self.plain(x).squeeze(-1),torch.zeros(len(x))
        d,s=self.drug(x[:,:11]),self.solvent(x[:,11:22]);z=torch.cat([d,s,d*s,torch.abs(d-s)] if self.interaction else [d,s],dim=1)
        base=self.base(z).squeeze(-1);temp=x[:,-1]*self.slope(z).squeeze(-1) if self.temperature else torch.zeros_like(base)
        return base,temp
    def forward(self,x):
        b,t=self.parts(x);return b+t

class NeuralRegressor(RegressorMixin,BaseEstimator):
    def __init__(self,seed=2026,width=64,epochs=160,lr=.003,weight_decay=.001,dropout=.05,delta_weight=0.,balanced=False,structured=False,interaction=True,temperature=True):
        self.seed=seed;self.width=width;self.epochs=epochs;self.lr=lr;self.weight_decay=weight_decay;self.dropout=dropout;self.delta_weight=delta_weight;self.balanced=balanced;self.structured=structured;self.interaction=interaction;self.temperature=temperature
    def fit(self,X,y,groups=None,pairs=None):
        torch.set_num_threads(2);X=np.asarray(X,dtype=np.float32);y=np.asarray(y,dtype=np.float32)
        if groups is None:groups=np.arange(len(y))
        if pairs is None:pairs=np.arange(len(y))
        self.transform_=FoldTransform().fit(X,y);xx=self.transform_.x(X);yy=(y-self.transform_.ym)/self.transform_.ys
        a,b,dy,dw=delta_examples(xx,yy,groups,pairs)
        xt=torch.tensor(xx);yt=torch.tensor(yy);wt=torch.tensor(weights(groups,self.balanced));dyt=torch.tensor(dy);dwt=torch.tensor(dw)
        with torch.random.fork_rng(devices=[]):
            torch.manual_seed(self.seed);self.model_=ConditionalNetwork(self.width,self.dropout,self.structured,self.interaction,self.temperature)
            optimizer=torch.optim.AdamW(self.model_.parameters(),lr=self.lr,weight_decay=self.weight_decay)
            self.loss_curve_=[]
            for epoch in range(self.epochs):
                self.model_.train();optimizer.zero_grad();pred=self.model_(xt)
                point=(nn.functional.huber_loss(pred,yt,reduction='none',delta=1.)*wt).mean()
                # Identical structures must have identical predictions for tied T in auxiliary evaluation.
                if self.delta_weight and len(a):
                    self.model_.eval();dp=self.model_(xt)
                    dl=(nn.functional.huber_loss(dp[b]-dp[a],dyt,reduction='none',delta=1.)*dwt).mean()
                else:dl=point*0
                loss=point+self.delta_weight*dl
                if not torch.isfinite(loss):raise FloatingPointError('Non-finite objective')
                loss.backward();nn.utils.clip_grad_norm_(self.model_.parameters(),10);optimizer.step();self.loss_curve_.append(float(loss.detach()))
        self.model_.eval();self.n_features_in_=23
        self.training_metadata_={'epochs':self.epochs,'rows':len(y),'difference_pairs':len(a),'internal_validation_rows':0,'loss':'parent-weighted Huber + within-pair difference Huber','params':self.get_params()}
        return self
    def predict_parts(self,X):
        self.model_.eval()
        with torch.inference_mode():b,t=self.model_.parts(torch.tensor(self.transform_.x(X)))
        return b.numpy()*self.transform_.ys+self.transform_.ym,t.numpy()*self.transform_.ys
    def predict(self,X):
        b,t=self.predict_parts(X);return np.asarray(b+t,dtype=float)
