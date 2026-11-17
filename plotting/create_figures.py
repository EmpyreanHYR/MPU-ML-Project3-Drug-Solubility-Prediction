"""Render Chinese paper figures from saved evidence; never fit a model.

Run from repository root: uv run python plotting/create_figures.py --figures 1 2 3
Each quantitative display exports its plotted source table and figure audits.
"""
from __future__ import annotations

from pathlib import Path
import argparse
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "plotting"))
import numpy as np
import pandas as pd
from matplotlib.colors import ListedColormap
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from style import canvas, panel, save_figure, source_table, COLORS, QA, SOURCE
from src.data import load_data

ARTIFACTS = ROOT / "artifacts"
BASE = ["Dummy", "Ridge", "RandomForest", "ExtraTrees", "HistGradientBoosting", "TabM", "RealMLP"]
DISPLAY = {"Dummy":"均值预测", "Ridge":"Ridge", "RandomForest":"随机森林", "ExtraTrees":"ExtraTrees", "HistGradientBoosting":"HGB", "TabM":"TabM", "RealMLP":"RealMLP"}


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def experiment(exp_id):
    directory = ARTIFACTS / "experiments" / exp_id
    return read_json(directory/"metrics.json"), pd.read_csv(directory/"predictions.csv")


def bootstrap_mean(values, seed=2026, repetitions=2000):
    values = np.asarray(values, dtype=float)
    if not len(values) or not np.isfinite(values).all():
        raise ValueError("Invalid source values for group bootstrap")
    rng = np.random.default_rng(seed)
    samples = rng.choice(values, size=(repetitions, len(values)), replace=True).mean(axis=1)
    return float(values.mean()), *map(float, np.quantile(samples,[.025,.975]))


def paired_effect(reference, alternative):
    pair = reference.merge(alternative, on=["data_row", "parent_id"], suffixes=("_reference", "_alternative"), validate="one_to_one")
    if len(pair) != len(reference) or len(pair) != len(alternative):
        raise ValueError("Paired experiments must have identical validation rows")
    if not np.allclose(pair.y_reference, pair.y_alternative):
        raise ValueError("Paired experiments disagree on observed targets")
    pair["delta_abs_error"] = np.abs(pair.y_alternative-pair.prediction_alternative)-np.abs(pair.y_reference-pair.prediction_reference)
    group = pair.groupby("parent_id", as_index=False).delta_abs_error.mean()
    return group


def figure1():
    data=load_data()
    data["drug_canonical"] = data.pair.str.split("|", regex=False).str[0]
    data["solvent_canonical"] = data.pair.str.split("|", regex=False).str[1]
    # A deterministic ordering reveals sparse coverage without discarding cells.
    drug_order=data.groupby("drug_canonical").size().sort_values(ascending=False).index
    solvent_order=data.groupby("solvent_canonical").size().sort_values(ascending=False).index
    matrix=pd.crosstab(data.drug_canonical,data.solvent_canonical).reindex(index=drug_order,columns=solvent_order,fill_value=0)
    source=matrix.rename_axis("drug_canonical").reset_index().melt(id_vars="drug_canonical",var_name="solvent_canonical",value_name="records")
    p1=source_table(source,"fig1_pair_coverage")
    groups=data.groupby("parent_group_id",as_index=False).size().sort_values("size",ascending=False).reset_index(drop=True)
    groups["rank"]=np.arange(1,len(groups)+1)
    p2=source_table(groups,"fig1_parent_sampling")
    fig,axs=canvas(height_mm=86)
    a,b=axs[0]
    a.imshow(matrix.to_numpy()>0,aspect="auto",interpolation="nearest",cmap=ListedColormap(["#F2F4F5",COLORS["traditional"]]),origin="lower",extent=(.5,len(solvent_order)+.5,.5,len(drug_order)+.5))
    a.set(xlabel="溶剂序号（按记录数排序）",ylabel="药物结构序号")
    panel(a,"a",f"已观测组合：{int((matrix>0).sum().sum())}/{matrix.size}")
    b.plot(groups["rank"],groups["size"],color=COLORS["selected"],linewidth=1.6)
    b.set(xlabel="母体组序号（按记录数排序）",ylabel="记录数",ylim=(0,max(groups["size"])*1.08))
    panel(b,"b",f"{len(groups)}个母体组的采样不均衡")
    save_figure(fig,"fig1_data_structure",[ROOT/"datasets/data_2026.csv",p1,p2],{
        "claim":"Coverage is sparse and records are clustered within parent families.",
        "n_rows":len(data),"n_parent_groups":len(groups),"uncertainty":"none: complete dataset counts, not a sampling estimator",
        "panel_a":"Blue indicates at least one observed drug-solvent pair; white indicates no record.",
        "exclusions":"none",
    })


def figure2():
    frozen=read_json(ARTIFACTS/"selection_frozen.json")
    selected=frozen["selected"]["exp_id"]
    ids=[name+"_base" for name in BASE]
    if selected not in ids:ids.append(selected)
    records=[]
    for role,directory in [("开发集OOF","experiments"),("预留测试集","final_results")]:
        for exp_id in ids:
            values=read_json(ARTIFACTS/directory/exp_id/"metrics.json")
            lo,hi=values["macro_MAE_CI95"]
            records.append({"role":role,"experiment_id":exp_id,"model_name":values["model_name"],"selected":exp_id==selected,"macro_mae":values["parent_macro_MAE"],"ci_low":lo,"ci_high":hi})
    source=pd.DataFrame(records);p=source_table(source,"fig2_model_comparison")
    fig,axs=canvas(height_mm=105)
    for ax,role,label in zip(axs[0],["开发集OOF","预留测试集"],["a","b"]):
        frame=source[source.role.eq(role)].reset_index(drop=True)
        names=[]
        for position,row in frame.iterrows():
            name=DISPLAY[row.model_name]
            if row.selected:name+="*"
            names.append(name)
            color=COLORS["selected"] if row.selected else COLORS["modern"] if row.model_name in {"TabM","RealMLP"} else COLORS["baseline"]
            marker="s" if row.model_name in {"TabM","RealMLP"} else "o"
            ax.errorbar(row.macro_mae,position,xerr=[[row.macro_mae-row.ci_low],[row.ci_high-row.macro_mae]],fmt=marker,color=color,markersize=4.8,capsize=2,elinewidth=1)
        ax.set_yticks(np.arange(len(frame)),names)
        ax.invert_yaxis();ax.set(xlabel="母体等权MAE（log10）",xlim=(0,max(source.ci_high)*1.06))
        ax.grid(axis="x",color="#DDE1E5",linewidth=.4)
        panel(ax,label,role)
    save_figure(fig,"fig2_model_comparison",[p,ARTIFACTS/"selection_frozen.json",ARTIFACTS/"final_metrics.csv"],{
        "claim":"Compare model performance under one frozen parent-family protocol; ranking is determined by observed results.",
        "center":"parent-family macro MAE", "interval":"2,000 parent-group bootstrap percentile 95% CI",
        "development":"1,507 records,128 parent groups,5 fixed grouped folds; model-selection score",
        "test":"397 records,33 parent groups; not used for model selection",
        "baseline":"Training-fold mean; all baseline models use the same 23 descriptors and temperature inputs",
        "selection":"Development pooled OOF parent macro MAE, never final test ranking",
    })


def figure3():
    selected=read_json(ARTIFACTS/"selection_frozen.json")["selected"]["exp_id"]
    _,reference=experiment(selected)
    summaries=[];source_groups=[]
    for exp_id,label in [("ablation_no_temperature","移除温度"),("ablation_no_solvent","移除溶剂"),("ablation_no_drug","移除药物")]:
        _,alternative=experiment(exp_id)
        group=paired_effect(reference,alternative)
        center,lo,hi=bootstrap_mean(group.delta_abs_error)
        summaries.append({"panel":"a","experiment_id":exp_id,"label":label,"delta_macro_mae":center,"ci_low":lo,"ci_high":hi})
        group["experiment_id"]=exp_id;source_groups.append(group)
    _,tree_ref=experiment("ExtraTrees_base")
    for exp_id,label in [("ExtraTrees_fp","仅指纹"),("ExtraTrees_combined","描述符＋指纹")]:
        _,alternative=experiment(exp_id)
        group=paired_effect(tree_ref,alternative)
        center,lo,hi=bootstrap_mean(group.delta_abs_error)
        summaries.append({"panel":"b","experiment_id":exp_id,"label":label,"delta_macro_mae":center,"ci_low":lo,"ci_high":hi})
        group["experiment_id"]=exp_id;source_groups.append(group)
    summary=pd.DataFrame(summaries)
    p1=source_table(summary,"fig3_paired_effects");p2=source_table(pd.concat(source_groups,ignore_index=True),"fig3_parent_paired_errors")
    fig,axs=canvas(height_mm=84)
    for ax,letter,title in zip(axs[0],["a","b"],["选定模型：信息消融","ExtraTrees：表示替换"]):
        frame=summary[summary.panel.eq(letter)].reset_index(drop=True)
        for y,row in frame.iterrows():
            color=COLORS["accent"] if row.delta_macro_mae>0 else COLORS["selected"]
            ax.errorbar(row.delta_macro_mae,y,xerr=[[row.delta_macro_mae-row.ci_low],[row.ci_high-row.delta_macro_mae]],fmt="o",color=color,markersize=5,capsize=3)
        ax.axvline(0,color="#7A8086",linestyle="--",linewidth=.7)
        ax.set_yticks(np.arange(len(frame)),frame.label)
        ax.set_ylim(len(frame)-.4,-.6)
        ax.set_xlabel("配对MAE变化（正值表示误差增大）")
        panel(ax,letter,title)
    save_figure(fig,"fig3_ablation",[p1,p2],{
        "claim":"Feature-removal and representation comparisons isolate within-family changes on fixed validation rows.",
        "n":"128 development parent families,1,507 rows,5 fixed folds",
        "center":"Mean of per-parent paired absolute-error differences",
        "interval":"2,000 resamples of paired parent-group differences, percentile 95% CI",
        "reference_a":selected,"reference_b":"ExtraTrees_base descriptors+temperature",
        "multiplicity":"Exploratory comparisons; no confirmatory p-values or corrected significance claims",
    })


def figure4():
    selected=read_json(ARTIFACTS/"selection_frozen.json")["selected"]["exp_id"]
    _,reference=experiment(selected)
    records=[];paired=[]
    for exp_id,label in [("sensitivity_seed_17","随机种子17"),("sensitivity_seed_42","随机种子42"),("sensitivity_dedup_training","训练折去重")]:
        _,alternative=experiment(exp_id)
        group=paired_effect(reference,alternative);center,lo,hi=bootstrap_mean(group.delta_abs_error)
        records.append({"experiment_id":exp_id,"reference":selected,"label":label,"mean":center,"lo":lo,"hi":hi})
        group["experiment_id"]=exp_id;paired.append(group)
    candidates=[read_json(p) for p in (ARTIFACTS/"experiments").glob("ExtraTrees*/metrics.json")]
    tree=min(candidates,key=lambda r:r["parent_macro_MAE"])
    _,tree_ref=experiment(tree["exp_id"])
    _,alternative=experiment("sensitivity_ExtraTrees_parent_weight")
    group=paired_effect(tree_ref,alternative);center,lo,hi=bootstrap_mean(group.delta_abs_error)
    records.append({"experiment_id":"sensitivity_ExtraTrees_parent_weight","reference":tree["exp_id"],"label":"树模型母体等权","mean":center,"lo":lo,"hi":hi})
    group["experiment_id"]="sensitivity_ExtraTrees_parent_weight";paired.append(group)
    summary=pd.DataFrame(records);p1=source_table(summary,"fig4_sensitivity");p2=source_table(pd.concat(paired,ignore_index=True),"fig4_parent_paired_errors")
    tuning=[]
    for path in sorted((ARTIFACTS/"experiments").glob("ExtraTrees_tune_*/metrics.json")):
        r=read_json(path);tuning.append({"experiment_id":r["exp_id"],"leaf_min":r["params"]["min_samples_leaf"],"max_features":r["params"]["max_features"],"max_depth":r["params"]["max_depth"],"macro_mae":r["parent_macro_MAE"]})
    tuning=pd.DataFrame(tuning);p3=source_table(tuning,"fig4_hyperparameter_search")
    fig,axs=canvas(height_mm=87)
    fig.subplots_adjust(bottom=.25)
    a,b=axs[0]
    for y,r in summary.iterrows():
        a.errorbar(r["mean"],y,xerr=[[r["mean"]-r.lo],[r.hi-r["mean"]]],fmt="o",color=COLORS["selected"],capsize=2,markersize=4)
    a.axvline(0,color="#8A9299",linestyle="--",linewidth=.7)
    a.set_yticks(np.arange(len(summary)),summary.label);a.invert_yaxis()
    a.set_xlabel("配对MAE变化（log10）")
    panel(a,"a","固定验证折的训练灵敏度")
    shapes={8:"o",16:"s",None:"^"};colors={8:COLORS["traditional"],16:COLORS["accent"],None:COLORS["modern"]}
    # Fixed deterministic offsets expose all 20 configurations; no data are jittered randomly.
    for depth in [8,16,None]:
        group=tuning[tuning.max_depth.isna()] if depth is None else tuning[tuning.max_depth.eq(depth)]
        offsets=(group.max_features.to_numpy()-.75)*.5
        assert (group.leaf_min.to_numpy() > 0).all(), "Leaf count must be strictly positive for log2 positions"
        x=np.log2(group.leaf_min.to_numpy())+offsets
        b.scatter(x,group.macro_mae,s=22,marker=shapes[depth],color=colors[depth],label="不限深度" if depth is None else f"深度{depth}")
    b.set_xticks([0,1,2,3],["1","2","4","8"])
    b.set(xlabel="叶节点最少样本数",ylabel="开发集母体等权MAE")
    b.legend(loc="upper left",bbox_to_anchor=(0,-.30),ncol=3,borderaxespad=0,columnspacing=.8,handletextpad=.3)
    panel(b,"b",f"{len(tuning)}组超参数配置")
    save_figure(fig,"fig4_sensitivity",[p1,p2,p3],{
        "claim":"Inspect sensitivity to training choices and hyperparameters without tuning on holdout.",
        "panel_a":"Paired parent-group differences,2,000 bootstrap percentile 95%CI; seed is model seed, not a new split",
        "panel_a_reference":records,"panel_b":"All20 tested configurations; raw OOF scores, not mean of repetitions; no uncertainty bar for individual configurations",
        "offset_rule":"Horizontal offset=(max_features-0.75)*0.5 on log2 leaf-count positions, solely to expose configurations",
        "exclusions":"none",
    })


FEATURE_ZH={"MolWt":"分子量","MolLogP":"LogP","TPSA":"极性表面积","HBD":"氢键供体","HBA":"氢键受体","RotatableBonds":"可旋转键","RingCount":"环数","AromaticRings":"芳香环","HeavyAtomCount":"重原子数","FractionCSP3":"CSP3比例","FormalCharge":"形式电荷"}

def feature_label(name):
    if name=="Temperature":return "温度"
    side,key=name.split("_",1)
    return ("药物·" if side=="drug" else "溶剂·")+FEATURE_ZH.get(key,key)


def figure5():
    directory=ARTIFACTS/"analysis"
    shap=pd.read_csv(directory/"shap_importance.csv")
    permutation=pd.read_csv(directory/"group_permutation.csv")
    meta=read_json(directory/"explainability_metadata.json")
    shap["display_label"]=shap.feature.map(feature_label)
    p1=source_table(shap,"fig5_shap_reference")
    summary=permutation.groupby("group",as_index=False).delta_macro_MAE.agg(["mean","std"]).reset_index()
    p2=source_table(permutation,"fig5_block_permutations");p3=source_table(summary,"fig5_block_permutation_summary")
    fig,axs=canvas(height_mm=142)
    fig.subplots_adjust(left=.14)
    a,b=axs[0]
    a.barh(np.arange(len(shap)),shap.mean_abs_SHAP,color=[COLORS["traditional"] if str(f).startswith("drug_") else COLORS["accent"] if str(f).startswith("solvent_") else COLORS["selected"] for f in shap.feature],height=.72)
    a.set_yticks(np.arange(len(shap)),shap.display_label,fontsize=7)
    a.invert_yaxis();a.set_xlabel("平均绝对SHAP值（log10）")
    panel(a,"a","参考模型：ExtraTrees基础模型")
    order=["drug","solvent","temperature"]
    labels={"drug":"药物结构块","solvent":"溶剂结构块","temperature":"温度"}
    for position,g in enumerate(order):
        row=summary[summary.group.eq(g)].iloc[0]
        values=permutation[permutation.group.eq(g)].delta_macro_MAE.to_numpy()
        # All20 repeat values are shown with deterministic symmetric offsets.
        b.scatter(values,position+np.linspace(-.12,.12,len(values)),s=9,color=COLORS["baseline"],alpha=.7)
        b.errorbar(row["mean"],position,xerr=row["std"],fmt="o",markersize=5,color=COLORS["selected"],capsize=3)
    b.set_yticks(np.arange(3),[labels[g] for g in order]);b.set_ylim(2.7,-.7)
    b.axvline(0,color="#8A9299",linewidth=.6,linestyle="--")
    b.set_xlabel("置换后母体等权MAE增量")
    panel(b,"b","选定模型：输入块置换")
    save_figure(fig,"fig5_explainability",[p1,p2,p3,directory/"explainability_metadata.json"],{
        "claim":"Tree-reference attribution and selected-model block disruption provide distinct, noncausal explanatory evidence.",
        "panel_a_model":meta["SHAP_model"],"panel_b_model":meta["group_permutation_model"],
        "n":meta["SHAP_rows"],"panel_a_uncertainty":"none: mean attribution across all holdout rows, descriptive not a population interval",
        "panel_b_uncertainty":"mean ± one SD over20 random block permutations; grey marks display all20 repetitions; not a CI",
        "caveat":"SHAP is not causal; permutations may generate combinations outside support; panels may explain different models",
        "exclusions":"none; all23 descriptor features and all3 input blocks shown",
    })


def figure6():
    directory=ARTIFACTS/"analysis"
    design=read_json(directory/"causal_design.json")
    stats=read_json(directory/"causal_associations.json")
    slopes=pd.DataFrame([
        {"estimator":"未调整关联","slope":stats["pooled_same_subset_slope"],"ci_low":stats["pooled_same_subset_cluster_ci"][0],"ci_high":stats["pooled_same_subset_cluster_ci"][1],"interval":"parent-cluster robust normal interval; same rows as within-pair model"},
        {"estimator":"组合固定效应","slope":stats["within_pair_slope"],"ci_low":stats["within_cluster_ci"][0],"ci_high":stats["within_cluster_ci"][1],"interval":"parent-cluster robust normal interval"},
    ])
    p1=source_table(slopes,"fig6_temperature_associations")
    edges=pd.DataFrame(design["DAG_edges"],columns=["cause","effect"]);p2=source_table(edges,"fig6_assumed_dag")
    fig,axs=canvas(height_mm=92)
    a,b=axs[0]
    a.set_xlim(0,1);a.set_ylim(0,1);a.axis("off")
    positions={"Drug":(.16,.83),"Solvent":(.84,.83),"U":(.5,.51),"Temperature":(.16,.18),"Y":(.84,.18)}
    labels={"Drug":"药物结构","Solvent":"溶剂结构","U":"未观测条件 U","Temperature":"温度 T","Y":"溶解度 Y"}
    widths={"Drug":.27,"Solvent":.27,"U":.36,"Temperature":.24,"Y":.25}
    boxes={}
    for node,(x,y) in positions.items():
        width=widths[node]
        box=FancyBboxPatch((x-width/2,y-.065),width,.13,boxstyle="round,pad=0.01,rounding_size=0.02",facecolor="#F1EEF5" if node=="U" else "#EDF3F6",edgecolor="#A2ACB5",linewidth=.6)
        a.add_patch(box);boxes[node]=box;a.text(x,y,labels[node],ha="center",va="center",fontsize=7)
    for cause,effect in design["DAG_edges"]:
        # Edge routing avoids node text. Drug/Solvent cross paths pass above U.
        rad=0
        if (cause,effect)==("Drug","Y"):rad=-.55
        if (cause,effect)==("Solvent","Temperature"):rad=.55
        arrow=FancyArrowPatch(positions[cause],positions[effect],patchA=boxes[cause],patchB=boxes[effect],arrowstyle="-|>",mutation_scale=8,linewidth=.7,color=COLORS["modern"] if cause=="U" else "#667783",connectionstyle=f"arc3,rad={rad}",linestyle="--" if cause=="U" else "-")
        a.add_patch(arrow)
    panel(a,"a","假设因果结构：未由CSV识别")
    for position,row in slopes.iterrows():
        b.errorbar(row.slope,position,xerr=[[row.slope-row.ci_low],[row.ci_high-row.slope]],fmt="o",color=COLORS["traditional"] if position==0 else COLORS["selected"],capsize=3,markersize=5)
    b.axvline(0,color="#8A9299",linestyle="--",linewidth=.7)
    b.set_yticks([0,1],slopes.estimator);b.set_ylim(1.6,-.6)
    b.set_xlabel("斜率（log10 / 原始温度单位）")
    panel(b,"b","调整已观测组合后的关联")
    save_figure(fig,"fig6_causal_boundary",[p1,p2,directory/"causal_design.json",directory/"causal_associations.json"],{
        "claim":"Observed temperature association is not an identified intervention effect because unobserved conditions can confound T and Y.",
        "DAG":"Explicit assumptions, not learned or proven causal structure; dashed U edges denote unmeasured confounding",
        "panel_b":"Both intervals use parent-cluster robust normal95% CI; group bootstrap fixed-effect interval is separately in source JSON/report",
        "scope":"development only", "n_within_rows":stats["within_rows"],"n_pairs":stats["within_pairs"],"n_parents":stats["within_parent_groups"],
        "exclusion":"Constant-temperature pair rows excluded only from within-pair slope because they have zero identifying temperature variation; count in source JSON",
        "causal_claim":"No do(T) effect identified; coefficient is association conditional on exact molecule-solvent pairs",
    })


def figure7():
    directory=ARTIFACTS/"analysis"
    errors=pd.read_csv(directory/"holdout_error_rows.csv")
    p1=source_table(errors,"fig7_holdout_predictions")
    p2=source_table(pd.read_csv(directory/"holdout_parent_errors.csv"),"fig7_parent_errors")
    fig,axs=canvas(height_mm=88)
    a,b=axs[0]
    a.scatter(errors.Solubility_log10,errors.prediction,s=13,color=COLORS["selected"],alpha=.55,linewidths=0,rasterized=True)
    limits=[min(errors.Solubility_log10.min(),errors.prediction.min())-.2,max(errors.Solubility_log10.max(),errors.prediction.max())+.2]
    a.plot(limits,limits,color="#7A8086",linestyle="--",linewidth=.7)
    a.set(xlim=limits,ylim=limits,xlabel="观测log10溶解度",ylabel="预测log10溶解度")
    panel(a,"a",f"全部{len(errors)}条预留测试记录")
    b.scatter(errors.Solubility_log10,errors.residual,s=13,color=COLORS["traditional"],alpha=.55,linewidths=0,rasterized=True)
    b.axhline(0,color="#7A8086",linestyle="--",linewidth=.7)
    b.set(xlabel="观测log10溶解度",ylabel="残差：预测 - 观测")
    panel(b,"b","误差是否随目标区间变化")
    save_figure(fig,"fig7_error_analysis",[p1,p2],{
        "claim":"All holdout predictions reveal calibration and error boundaries beyond aggregate MAE.",
        "n":len(errors),"n_parent_groups":errors.parent_group_id.nunique(),"uncertainty":"none: every observation is displayed, no averaged estimator shown",
        "exclusions":"none","scatter":"Rasterized point marks only; labels and axes remain editable vectors",
    })


FUNCTIONS={"1":figure1,"2":figure2,"3":figure3,"4":figure4,"5":figure5,"6":figure6,"7":figure7}

def audit_modular_sources():
    # The vendor validator is lexical and does not resolve imports. Inspect both
    # actual modules together so shared font/export settings are not false FAILs.
    parts=[]
    for path in [ROOT/"plotting/style.py",Path(__file__).resolve()]:
        parts.append("# SOURCE MODULE: "+str(path.relative_to(ROOT))+"\n"+path.read_text().replace("from __future__ import annotations", ""))
    combined=QA/"combined_source_for_static_audit.py"
    combined.write_text("\n\n".join(parts))
    result=subprocess.run([sys.executable,str(ROOT/"tools/figure_qa/validate_figure.py"),str(combined),"--json"],capture_output=True,text=True)
    (QA/"source_validation.json").write_text(result.stdout)
    report=json.loads(result.stdout)
    if report["summary"]["counts"]["FAIL"]:
        raise RuntimeError("Plotting source validation failed")

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--figures",nargs="+",choices=list(FUNCTIONS),default=list(FUNCTIONS))
    args=parser.parse_args()
    audit_modular_sources()
    for figure in args.figures:
        FUNCTIONS[figure]()
        print(f"Figure {figure}: rendered and automated QA complete",flush=True)

if __name__=="__main__":main()
