"""Combined, source-linked experiment index. Writes experiments only."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import json
import numpy as np
import pandas as pd
from src.data import ROOT,load_data,development_splits
from src.paths import model_path
from src.metrics import regression_metrics

OUT=ROOT/'output/combination_v3'


def main():
    first=pd.read_csv(OUT/'comparison.csv')
    first['round']='first'
    tables=[first]
    second_path=OUT/'tabpfn_nested/comparison.csv'
    if second_path.exists():
        second=pd.read_csv(second_path);second['round']='second';tables.append(second)
    table=pd.concat(tables,ignore_index=True).sort_values('parent_macro_MAE')
    table.to_csv(OUT/'all_nested_comparison.csv',index=False)
    data=load_data();dev=data[data.role.eq('development')].reset_index(drop=True)
    held=set(data.loc[~data.role.eq('development'),'data_row'])
    old=pd.read_csv(ROOT/'output/revision_v2/nested/AdaptiveHybrid/predictions.csv')
    old_error=old.assign(e=np.abs(old.y-old.prediction)).groupby('parent_id').e.mean()
    idx=np.random.default_rng(2026).integers(0,len(old_error),size=(10000,len(old_error)))
    paired=[];ensembled=[];coverage=[]
    for _,row in table.iterrows():
        if row.model.startswith('Original_'):
            folder=ROOT/'output/revision_v2/nested'/row.model.removeprefix('Original_')
        else:
            folder=(OUT/'nested' if row['round']=='first' else OUT/'tabpfn_nested/nested')/row.model
        p=pd.read_csv(folder/'predictions.csv')
        assert len(p)==3*len(dev) and not p[['data_row','seed']].duplicated().any()
        assert not set(p.data_row)&held
        assert np.isfinite(p[['y','prediction']]).all().all()
        aligned=p.merge(dev[['data_row','parent_group_id','Solubility_log10']],on='data_row',validate='many_to_one')
        assert aligned.parent_id.eq(aligned.parent_group_id).all()
        np.testing.assert_allclose(aligned.y,aligned.Solubility_log10,atol=1e-12)
        for seed,g in p.groupby('seed'):
            assert set(g.data_row)==set(dev.data_row)
        for fold,(tr,va) in enumerate(development_splits(dev),1):
            assert set(p.loc[p.fold.eq(fold),'data_row'])==set(dev.iloc[va].data_row)
            search=folder/f'fold_{fold}/search'
            if search.exists():
                selected=json.loads((search/'selected.json').read_text())
                path=search/f"predictions_{selected['candidate']:02}.csv"
                # Older baselines retained scores but not inner OOF; all new families do.
                if path.exists():
                    inner=pd.read_csv(path)
                    assert set(inner.data_row)==set(dev.iloc[tr].data_row)
                    assert not set(inner.data_row)&set(dev.iloc[va].data_row)
                    assert inner.groupby('parent_id').inner_fold.nunique().eq(1).all()
            weights_path=folder/f'fold_{fold}/weights.json'
            if weights_path.exists():
                weights=json.loads(weights_path.read_text())['weights']
                assert all(w>=0 for w in weights.values()) and np.isclose(sum(weights.values()),1)
        per_parent=p.assign(e=np.abs(p.y-p.prediction)).groupby('parent_id').e.mean().reindex(old_error.index)
        delta=(per_parent-old_error).to_numpy()
        ci=np.quantile(delta[idx].mean(1),[.025,.975])
        paired.append(dict(model=row.model,macro_MAE=per_parent.mean(),delta_vs_SOLAR_H=delta.mean(),
                           reduction_percent=-delta.mean()/old_error.mean()*100,
                           ci_low=ci[0],ci_high=ci[1],improved_parents=int((delta<0).sum())))
        avg=p.groupby(['data_row','parent_id'],as_index=False).agg(y=('y','first'),prediction=('prediction','mean'))
        ensembled.append(dict(model=row.model,**regression_metrics(avg.y,avg.prediction,avg.parent_id)))
        coverage.append(dict(model=row.model,rows_per_seed=len(dev),seeds=sorted(map(int,p.seed.unique())),heldout_rows=0))
    pd.DataFrame(paired).to_csv(OUT/'paired_comparisons_all.csv',index=False)
    pd.DataFrame(ensembled).sort_values('parent_macro_MAE').to_csv(OUT/'seed_ensemble_comparison.csv',index=False)
    (OUT/'combined_checks.json').write_text(json.dumps(dict(status='passed',coverage=coverage,
        holdout_used=False,
        explanation='All metrics exploratory; averaging seeds is not three independent group experiments'),indent=2)+'\n')
    chosen=['Original_AdaptiveHybrid','Original_ExtraTrees','RichExtraTrees','Blend_RichExtraTrees_RichCatBoost','MultiViewBlend']
    if second_path.exists():chosen.extend(['TabPFN','TabPFN_TwoTreeBlend','TabPFN_ExtraTreesBlend','TabPFN_FiveViewBlend'])
    summary=table.set_index('model')
    lines=['# 本轮模型改进实验','',
        '本目录保留原实验数值；模型权重位于 models/。','',
        '沿用1507行、128个药物母体的冻结五折；每折内部再以三折母体交叉验证选择参数与凸组合权重。训练种子2026/17/42；未对397行历史保留集评分。','',
        '## 主要结果','',
        '|方法|母体MAE ↓|样本MAE ↓|RMSE ↓|R² ↑|',
        '|---|---:|---:|---:|---:|']
    for name in chosen:
        if name in summary.index:
            r=summary.loc[name];lines.append(f'|{name}|{r.parent_macro_MAE:.4f}|{r.MAE:.4f}|{r.RMSE:.4f}|{r.R2:.4f}|')
    best=table.iloc[0]
    best_pair=next(x for x in paired if x['model']==best.model)
    lines.extend(['',
        f'当前最低探索分数：{best.model}，母体MAE {best.parent_macro_MAE:.5f}，相对原SOLAR-H降低{best_pair["reduction_percent"]:.2f}%。这只是已试方法中的开发集探索结果。',
        '第一轮预先指定主方法为MultiViewBlend，第二轮预先指定补充主方法为TabPFN_TwoTreeBlend；其他子集只作探索比较。候选与方向已参考旧开发结果及本轮pilot，不是全新确认性测试。',
        'paired_comparisons_all.csv记录逐母体配对bootstrap区间；区间没有校正反复开发和多方案筛选造成的选择偏差。seed_ensemble_comparison.csv另列“先平均3个种子预测”的结果，不与主表“先计算每种子指标再平均”混用。','',
        '## 保存的文件','',
        '- [全部嵌套结果](all_nested_comparison.csv)',
        '- [各模型配对差值及区间](paired_comparisons_all.csv)',
        '- [最终完整性检查](combined_checks.json)',
        '- [第一轮研究模型](../../models/combination_v3/deployment/model.joblib)',
        '- [双树研究模型](../../models/combination_v3/deployment/two_tree_model.joblib)',
        '- [第一轮复现入口](../../scripts/reproduce.sh)','',
        '研究模型使用完整开发集重新选择参数与权重后拟合，保存在实验目录；未替换应用的现有模型。模型版本、训练数据、参数、权重与哈希见对应metadata.json。',
        '', '## 实现内容','',
        '扩展217个RDKit描述符、相互作用与母体均衡训练；比较ExtraTrees、CatBoost、Tanimoto/描述符多视角KRR/SVR与TabM，并穷举有限凸组合。TabPFN补充实验明确固定Nature2025对应的原始v2权重，仅本地推理，关闭遥测。',
        '算法组合受已发表工作启发，不宣称原创模型或按论文默认配置复现。温度保持CSV原数值尺度。',
        '', '运行异常记录：第一轮序列化断言最初要求逐位相同，ExtraTrees并行求和出现4.44e-16差异；仅将该断言容差改为1e-12，原始协议与改动原因完整保留在protocol_initial.json与protocol_amendment.json。训练/选择/外层预测均未因此改变。'])
    if second_path.exists():
        lines.extend(['','第二轮完整结果见[tabpfn_nested/comparison.csv](tabpfn_nested/comparison.csv)，原始权重和许可保存在models/combination_v3/tabpfn_probe/，第二轮协议与逐行预测保存在tabpfn_nested/。'])
    if model_path(OUT/'tabpfn_nested/deployment/TabPFN_ExtraTreesBlend.joblib').exists():
        lines.extend(['',
            '- [TabPFN＋ExtraTrees研究模型](../../models/combination_v3/tabpfn_nested/deployment/TabPFN_ExtraTreesBlend.joblib)',
            '- [TabPFN＋双树研究模型](../../models/combination_v3/tabpfn_nested/deployment/TabPFN_TwoTreeBlend.joblib)',
            '- [第二轮复现入口](../../scripts/reproduce_tabpfn.sh)',
            '', '预测入口：在项目根目录运行 `.venv/bin/python yuchunshen/run.py predict_combination_v3.py --drug-smiles CCO --solvent-smiles O --temperature 25`。输出为CSV目标字段的log10预测值；温度输入仍使用CSV原始数值尺度。',
            'TabPFN研究模型需同时保留项目适配器和models/combination_v3/tabpfn_probe/tabpfn-v2-regressor.ckpt；权重未嵌入joblib，首次预测时在本机重建。'])
    lines.extend(['','## 未升格的对照','',
        '- [标准化相互作用](pair_pilot/comparison.csv)：8候选开发3折，未稳定超过原始交互。',
        '- [TabPFN训练上下文均衡](tabpfn_balancing_pilot/comparison.csv)：固定完整验证行，小幅收益未升格。',
        '- [CPU/MPS速度探测](tabpfn_cpu_probe/result.json)：单折探测，正式模型统一使用MPS。'])
    (OUT/'README.md').write_text('\n'.join(lines)+'\n')
    print(table.to_string(index=False))
    print('COMBINED CHECKS PASSED')


if __name__=='__main__':
    main()
