"""Build audited BibTeX and a claim-to-source ledger from saved primary metadata.

No network calls: raw/*.crossref.json and raw/*.official.bib preserve the
metadata retrieved on 2026-11-16. Publisher abstracts were checked separately.
"""
from pathlib import Path
import json
import re
import hashlib

ROOT=Path(__file__).resolve().parent
CLAIMS={
'ridge1970':('方法','Ridge的L2正则化与共线性处理','不证明本数据上Ridge必然最优','https://stat.cmu.edu/technometrics/70-79/VOL-12-01/v1201055.pdf'),
'randomforest2001':('方法','随机森林的随机特征选择与集成','不外推原论文实验成绩','https://www.stat.berkeley.edu/~breiman/randomforest2001.pdf'),
'extratrees2006':('方法','ExtraTrees随机化特征与切分点的树集成','本项目性能须由本地实验给出','https://link.springer.com/article/10.1007/s10994-006-6226-1'),
'boosting2001':('方法','梯度提升的逐步加性函数拟合','仅支撑算法原理；直方图实现另由软件文档记录','https://projecteuclid.org/journals/annals-of-statistics/volume-29/issue-5/Greedy-function-approximation-A-gradient-boosting-machine/10.1214/aos/1013203451.full'),
'ecfp2010':('方法','圆形指纹用局部连接环境表示分子','指纹不编码全部实验条件','https://pubmed.ncbi.nlm.nih.gov/20426451/'),
'molclr2022':('相关工作','利用无标签分子预训练改善分子表示的研究路线','本项目没有运行MolCLR或引入其预训练数据','https://www.nature.com/articles/s42256-022-00447-x'),
'solubility2024':('背景与局限','溶解度数据来源、离子状态和适用域会影响前瞻可靠性','该研究以水溶解度为主；不能推断本CSV的来源或误差成因','https://www.nature.com/articles/s41597-024-03105-6'),
'leakage2023':('评价设计','训练测试信息交叉和不独立性可使科学ML成绩乐观','不同预测任务的性能差不全是错误泄漏','https://pmc.ncbi.nlm.nih.gov/articles/PMC10499856/'),
'tabpfn2025':('近期相关工作','2025年表格基础模型在小数据基准上的进展','未在本项目运行TabPFN；不转用其论文成绩','https://www.nature.com/articles/s41586-024-08328-6'),
'treeshap2020':('可解释性方法','用树模型SHAP汇总局部贡献并分析全局预测行为','解释模型而非识别物理因果效应','https://www.nature.com/articles/s42256-019-0138-9'),
'causal2021':('因果分析边界','因果建模和分布泛化需要结构假设与可识别性','预测关联或SHAP贡献不能自动等同干预效应','https://ieeexplore.ieee.org/abstract/document/9363924'),
'molmerger2024':('领域相关工作','多溶剂溶解度建模显式表示溶质—溶剂相互作用的研究路线','本项目未运行MolMerger；传统描述符不等价于其图表示','https://pubs.acs.org/doi/10.1021/acs.jctc.4c00382'),
'bigsoldb2025':('近期数据背景','多溶剂与多温度溶解度数据的标准化与覆盖具有研究价值','不能把用户CSV归因于BigSolDB；本项目没有合并外部数据','https://www.nature.com/articles/s41597-025-05559-8'),
'tabm2025':('近期实验模型','TabM通过参数高效集成构建表格神经网络','本项目为资源限定配置，并非原论文完整基准复现','https://proceedings.iclr.cc/paper_files/paper/2025/hash/c1ba41c694834aeef91ae161711d4939-Abstract-Conference.html'),
'realmlp2024':('近期实验模型','RealMLP以预处理、参数化及调度构建强MLP默认方案','本项目为资源限定配置，不能冒称原论文默认性能','https://proceedings.neurips.cc/paper_files/paper/2024/hash/2ee1c87245956e3eaa71aaba5f5753eb-Abstract.html'),
'shap2017':('可解释性方法','SHAP将预测分解为特征贡献','特征贡献受背景与特征相关性影响，不是因果估计','https://proceedings.neurips.cc/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html'),
'trees2022':('近期基准','在特定表格基准上树模型是强比较对象','该结论不意味着所有小数据任务树模型必胜','https://papers.nips.cc/paper_files/paper/2022/hash/0378c7692da36807bdec87ab043cdadc-Abstract.html'),
'tabular2021':('近期基准','深度表格模型应在统一训练调参协议下与树模型比较','不声称本项目实现FT-Transformer','https://proceedings.neurips.cc/paper_files/paper/2021/hash/9d86d83f925f2149e9edb0ac3b49229c-Abstract.html'),
'skills2026':('AI辅助工具链来源','记录本项目使用的科学分析技能工作流来源','预印本且未报告任务级评价；不能用作模型有效性或因果结论证据','https://arxiv.org/abs/2609.00065')}


CLAIMS.pop('skills2026',None)
CLAIMS['integratedgradients2017']=('解释方法','积分梯度对神经网络输入进行归因','采用数值积分并检验完备性误差','https://proceedings.mlr.press/v70/sundararajan17a.html')
CLAIMS.update({
'fastsolv2025':('近期领域方法','结构、溶剂与温度联合建模及温度梯度监督','本项目温度差分MLP为受启发的控制模型，并非FASTSOLV完整复现','https://www.nature.com/articles/s41467-025-62717-7'),
'sensitivity2020':('因果敏感性方法','通过偏R平方参数化遗漏变量偏差','本项目仅分析固定效应线性斜率的点估计敏感性','https://doi.org/10.1111/rssb.12348')})

CLAIMS.update({
'discovery2023':('近期研究背景','自监督与几何学习为科学数据提供结构表示','用于研究背景，不作为本地模型性能证据','https://www.nature.com/articles/s41586-023-06221-2'),
'moleculestm2023':('近期分子表示','联合学习分子结构和文本支持跨模态检索与编辑','用于表示扩展方向','https://www.nature.com/articles/s42256-023-00759-6')})

def escape(s):
    return str(s).replace('&',r'\&').replace('%',r'\%').replace('_',r'\_')

def main():
    entries=[];records=[]
    for key,(role,claim,boundary,abstract_url) in CLAIMS.items():
        raw=ROOT/'raw'/f'{key}.crossref.json'
        if raw.exists():
            m=json.loads(raw.read_text())['message']
            authors=m['author']
            assert all(a.get('given') and a.get('family') for a in authors)
            year=m.get('published-print',m['published'])['date-parts'][0][0]
            title=m['title'][0]
            fields={'author':' and '.join(a['family']+', '+a['given'] for a in authors),
                    'title':'{'+title+'}','journal':m['container-title'][0],'year':str(year)}
            for source,target in [('volume','volume'),('issue','number'),('page','pages'),('DOI','doi')]:
                if m.get(source):fields[target]=str(m[source]).replace('-', '--') if target=='pages' else str(m[source])
            if not m.get('page') and m.get('article-number'):fields['pages']=m['article-number']
            fields['url']='https://doi.org/'+m['DOI']
            bib='@article{'+key+',\n'+',\n'.join('  '+k+' = {'+escape(v)+'}' for k,v in fields.items())+'\n}\n'
            venue=m['container-title'][0];doi=m['DOI'];author_names=[a['given']+' '+a['family'] for a in authors]
        else:
            raw=ROOT/'raw'/f'{key}.official.bib'
            if not raw.exists():raw=ROOT/'raw'/f'{key}.verified.bib'
            text=raw.read_text();bib=re.sub(r'(@\w+\{)[^,]+,',r'\g<1>'+key+',',text,count=1)
            bib=re.sub(r'^\s*pages\s*=\s*\{\},\n','',bib,flags=re.M)
            def field(name):
                hit=re.search(r'^\s*'+name+r'\s*=\s*\{(.*)\},?$',text,re.M)
                return hit.group(1) if hit else ''
            title=field('title');year=int(field('year'));venue=field('booktitle') or field('howpublished');doi=field('doi') or None
            author_names=field('author').split(' and ')
            assert all(',' in name and name.split(',')[1].strip() for name in author_names)
        entries.append(bib)
        records.append(dict(key=key,title=title,year=year,authors=author_names,venue=venue,doi=doi,
                            role=role,supported_claim=claim,boundary=boundary,
                            support_grade='method support' if role.endswith('方法') or role=='方法' else 'background or contextual support',
                            primary_abstract_or_full_text_url=abstract_url,
                            metadata_file=str(raw.relative_to(ROOT)),metadata_sha256=hashlib.sha256(raw.read_bytes()).hexdigest(),
                            access_date='2026-11-17',metadata_verified=True,abstract_or_primary_text_checked=True))
    (ROOT/'references.bib').write_text('\n'.join(entries),encoding='utf-8')
    (ROOT/'source_ledger.json').write_text(json.dumps({'scope':'Classic methods plus 2021–2026 primary journal/conference papers; CSV is the only training dataset','records':records},ensure_ascii=False,indent=2)+'\n')
    lines=['# 参考文献核验与论断对应表','',
           '检索/核验日期：2026-11-16至2026-11-17。采用Nature写作与引用技能的来源分级原则；按用户要求将文献范围扩展至ICLR、NeurIPS、IEEE及化学领域期刊。近期窗口为2021–2026；经典模型和解释方法保留原始出处。',
           '', '完整作者顺序来自保存的Crossref、会议官方BibTeX或已核验的arXiv页面。缺失DOI的会议论文不补造DOI；部分期刊首次访问受cookie/访问限制，核验采用可访问的出版社摘要、作者原稿或PubMed原始摘要。此表记录的是引用支持，不是系统综述。',
           '', '| 引用键 | 年份与出处 | 支持内容 | 使用边界 |', '|---|---|---|---|']
    for r in records:lines.append(f"| `{r['key']}` | {r['year']} · [{r['venue']}]({r['primary_abstract_or_full_text_url']}) | {r['supported_claim']} | {r['boundary']} |")
    lines+=['','共'+str(len(records))+'篇，其中'+str(sum(2021<=r['year']<=2026 for r in records))+'篇在2021–2026年范围（各来源的用途见上表）。不得把论文的基准成绩写成本项目实测成绩，不得把BigSolDB等外部数据写成用户CSV的已知来源。','',
            '复现导出：在仓库根目录运行 `python bibliography/build_bibliography.py`。原始元数据保存在 `bibliography/raw/`，导出过程不联网。']
    (ROOT/'source_ledger.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(f'Wrote {len(records)} verified entries.')

if __name__=='__main__':main()
