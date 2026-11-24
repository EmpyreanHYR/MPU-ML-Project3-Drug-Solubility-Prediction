"""Audit isolated experiment outputs and summarize paired, parent-level evidence."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import hashlib
import importlib.metadata
import json
import numpy as np
import pandas as pd
from src.data import ROOT, load_data, development_splits
from src.ownership import source_path
from src.paths import normalize_frozen
from src.metrics import regression_metrics

OUT = ROOT/"output/combination_v3"


def dump(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n")


def main():
    df = load_data()
    dev = df.loc[df.role.eq("development")].reset_index(drop=True)
    held = set(df.loc[~df.role.eq("development"), "data_row"])
    expected = set(dev.data_row)
    coverage = []
    per_fold = []
    for folder in sorted((OUT/"nested").iterdir()):
        path = folder/"predictions.csv"
        if not path.exists():
            raise AssertionError(f"Incomplete experiment: {folder}")
        pred = pd.read_csv(path)
        assert len(pred) == len(dev)*3
        assert pred[["seed","data_row"]].duplicated().sum() == 0
        assert np.isfinite(pred[["y","prediction"]]).all().all()
        assert not set(pred.data_row)&held
        for seed, p in pred.groupby("seed"):
            assert set(p.data_row) == expected
            joined = p.merge(dev[["data_row","Solubility_log10","parent_group_id"]],on="data_row",validate="one_to_one")
            np.testing.assert_allclose(joined.y,joined.Solubility_log10,atol=1e-12)
            assert joined.parent_id.eq(joined.parent_group_id).all()
        for fold,(tr,va) in enumerate(development_splits(dev),1):
            assert not set(dev.iloc[tr].parent)&set(dev.iloc[va].parent)
            p = pred.loc[pred.fold.eq(fold)]
            assert set(p.data_row) == set(dev.iloc[va].data_row)
            for seed,g in p.groupby("seed"):
                per_fold.append({"model":folder.name,"fold":fold,"seed":int(seed),
                                 **regression_metrics(g.y,g.prediction,g.parent_id)})
            search = folder/f"fold_{fold}/search"
            if search.exists():
                selected = json.loads((search/"selected.json").read_text())
                inner = pd.read_csv(search/f"predictions_{selected['candidate']:02}.csv")
                assert set(inner.data_row) == set(dev.iloc[tr].data_row)
                assert not set(inner.data_row)&set(dev.iloc[va].data_row)
                assert inner.groupby("parent_id").inner_fold.nunique().eq(1).all()
            weights_path = folder/f"fold_{fold}/weights.json"
            if weights_path.exists():
                weights = json.loads(weights_path.read_text())["weights"]
                assert all(w >= 0 for w in weights.values()) and np.isclose(sum(weights.values()),1.)
        coverage.append({"model":folder.name,"rows_per_seed":len(dev),"seeds":3,"heldout_rows":0})
    pd.DataFrame(per_fold).to_csv(OUT/"per_fold_metrics.csv",index=False)

    primary = pd.read_csv(OUT/"nested/MultiViewBlend/predictions.csv")
    primary["absolute_error"] = np.abs(primary.y-primary.prediction)
    primary_parent = primary.groupby("parent_id").absolute_error.mean()
    comparisons = {}
    errors = primary_parent.rename("MultiViewBlend").to_frame()
    rng = np.random.default_rng(2026)
    bootstrap_indices = rng.integers(0,len(primary_parent),size=(10000,len(primary_parent)))
    for baseline in ["AdaptiveHybrid","ExtraTrees"]:
        old = pd.read_csv(ROOT/"output/revision_v2/nested"/baseline/"predictions.csv")
        aligned = primary.merge(old,on=["data_row","seed"],suffixes=("_new","_old"),validate="one_to_one")
        assert len(aligned)==len(primary)
        np.testing.assert_allclose(aligned.y_new,aligned.y_old,atol=1e-12)
        assert aligned.fold_new.eq(aligned.fold_old).all()
        assert aligned.parent_id_new.eq(aligned.parent_id_old).all()
        old["absolute_error"] = np.abs(old.y-old.prediction)
        old_parent = old.groupby("parent_id").absolute_error.mean().reindex(primary_parent.index)
        assert old_parent.notna().all()
        errors[baseline]=old_parent
        delta=(primary_parent-old_parent).to_numpy()
        boot = delta[bootstrap_indices].mean(1)
        comparisons[baseline]={
            "old_parent_macro_MAE":float(old_parent.mean()),
            "new_parent_macro_MAE":float(primary_parent.mean()),
            "difference_new_minus_old":float(delta.mean()),
            "relative_reduction_percent":float(-delta.mean()/old_parent.mean()*100),
            "parent_paired_bootstrap_95CI":np.quantile(boot,[.025,.975]).tolist(),
            "improved_parents":int((delta<0).sum()),"total_parents":len(delta),
            "bootstrap_unit":"parent; average absolute error over that parent's rows and seeds",
            "interpretation":"exploratory uncertainty conditional on these fitted folds; not independent repeated experiments or a new heldout test",
        }
    errors.to_csv(OUT/"per_parent_absolute_errors.csv")
    dump(OUT/"paired_uncertainty.json",comparisons)
    frozen=normalize_frozen(json.loads((OUT/"protocol.json").read_text()))
    for relative,sha in frozen["code_sha256"].items():
        assert hashlib.sha256(source_path(ROOT/relative).read_bytes()).hexdigest()==sha
    dump(OUT/"checks.json",{
        "status":"passed","all_models":coverage,"layout_migration_verified":True,
        "outer_parent_overlap":0,"historical_holdout_evaluated":False,
        "inner_OOF_parent_grouping_checked":True,"prediction_target_alignment_checked":True,
        "all_values_finite":True,
    })
    table=pd.read_csv(OUT/"comparison.csv")
    primary_row=table.set_index("model").loc["MultiViewBlend"]
    weights=[json.loads((OUT/f"nested/MultiViewBlend/fold_{fold}/weights.json").read_text())["weights"] for fold in range(1,6)]
    deploy=json.loads((OUT/"deployment/metadata.json").read_text()) if (OUT/"deployment/metadata.json").exists() else {}
    lines=[
        "# 组合模型实验记录（不属于作业报告）","",
        "## Material Passport","",
        "- Origin Skill: academic-research-suite / experiment-agent",
        "- Origin Mode: run","- Origin Date: 2026-11-17",
        "- Verification Status: ANALYZED; actual training outputs and artifact consistency audited",
        "- Version Label: combination_v3","",
        "本轮仅新增实验实现和实验产物，未改作业报告、应用模型或原始数据。",
        "这是查看旧结果和开发集筛查后的探索性改进，不是独立确认性实验。历史397行测试数据未评分，也未用于选择。","",
        "## 实验协议","",
        "开发集1507行、128母体；沿用原冻结5个外层母体折。每个外层训练集内部以3折GroupKFold选择超参数，再使用所选模型的内部OOF预测选择非负凸组合权重（步长0.25）。",
        "主要预先指定方法为四分支 MultiViewBlend。三种随机种子为2026、17、42，主指标为逐种子母体宏平均MAE的均值；核方法确定性预测复用，不计作三个独立实验。",
        "比较全RDKit描述符/交互特征树、CatBoost、多视角KRR/SVR、原有TabM；所有2、3、4分支组合均记录，不能把15个方案中的最小值当作无偏最终性能。",
        "温度保留CSV原始数值尺度。没有药物名称目标编码，没有验证母体标签检索，没有外部数据或外部推理API。","",
        "## 结果","",
        "|模型|母体MAE ↓|样本MAE ↓|RMSE ↓|R² ↑|",
        "|---|---:|---:|---:|---:|",
    ]
    for _,r in table.iterrows():
        lines.append(f"|{r.model}|{r.parent_macro_MAE:.5f}|{r.MAE:.5f}|{r.RMSE:.5f}|{r.R2:.4f}|")
    lines.extend(["","## 主要比较与边界",""])
    for name,c in comparisons.items():
        lo,hi=c["parent_paired_bootstrap_95CI"]
        lines.append(f"- 对{name}：母体MAE相对降低{c['relative_reduction_percent']:.2f}%；新减旧差值{c['difference_new_minus_old']:.5f}，母体配对bootstrap 95%区间[{lo:.5f}, {hi:.5f}]；{c['improved_parents']}/128个母体改善。")
    lines.extend(["","区间只描述当前128个母体与固定已拟合折的重采样不确定性，未囊括反复开发选择的乐观偏差；不据此宣布独立验证成功。实际部署文件使用seed=2026单次拟合，表格是三种子的平均，二者不是同一个预测器。",
                  "","## 各外层折融合权重","","```json",json.dumps(weights,ensure_ascii=False,indent=2),"```", "",
                  "## 本地研究模型","","```json",json.dumps(deploy,ensure_ascii=False,indent=2),"```","",
                  "完整数据见comparison.csv、per_fold_metrics.csv、paired_uncertainty.json与nested/逐行预测。literature.md记录来源与实现边界。checks.json记录覆盖、划分和报告哈希检查。",
                  "","复现命令见reproduce.sh。安装环境版本见environment.json及requirements-experiment.txt。"])
    (OUT/"experiment_notes.md").write_text("\n".join(lines)+"\n")
    print(json.dumps(comparisons,ensure_ascii=False,indent=2))
    print("ALL MODEL ARTIFACT CHECKS PASSED; LAYOUT MIGRATION VERIFIED")


if __name__ == "__main__":
    main()
