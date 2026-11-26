"""One bounded refinement triggered by development ablation; preserve initial experiment."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));sys.path.insert(0,str(Path(__file__).resolve().parent))
import run_revision as runner
from src.revision_models.adaptive_hybrid_model import build_model
from src.data import load_data
old_create=runner.create_model;old_candidates=runner.candidates
runner.create_model=lambda name,seed,params:build_model(seed,**params) if name=='AdaptiveHybrid' else old_create(name,seed,params)
runner.candidates=lambda name: [{'temperature_gain':g,'alpha':1000.,'max_depth':d,'min_samples_leaf':1,'n_estimators':200} for g in [0.,.1,.3,1.] for d in [8,16,None]] if name=='AdaptiveHybrid' else old_candidates(name)
runner.CUSTOM.add('AdaptiveHybrid')
if __name__=='__main__':
    runner.dump(runner.OUT/'adaptive_protocol.json',{'trigger':'development ablations: full hybrid temperature branch increased error','change':'gain selected only by inner group CV; fixed 12-config search','candidates':runner.candidates('AdaptiveHybrid'),'stage':'one exploratory refinement after original outer results were inspected; not a pristine confirmatory replication','historical_test_not_used_to_define_refinement':True})
    df=load_data();dev=df[df.role.eq('development')].reset_index(drop=True);test=df[df.role.ne('development')].reset_index(drop=True)
    runner.nested('AdaptiveHybrid',dev);runner.collect();runner.final('AdaptiveHybrid',dev,test)
    import revision_diagnostics as diagnostic
    for key in ['balanced','interaction','temperature']:diagnostic.evaluate('AdaptiveHybrid_no_'+key,'AdaptiveHybrid',{key:False},dev)
    diagnostic.evaluate('AdaptiveHybrid_full_gain','AdaptiveHybrid',{'temperature_gain':1.},dev)
    for frac in [.25,.5,.75]:diagnostic.evaluate('AdaptiveHybrid_fraction_'+str(frac),'AdaptiveHybrid',{},dev,frac)
