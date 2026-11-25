const SOLAR_NOTES = {
  "opening": {
    "time": "0:25 · Jiayun Song",
    "body": "Good afternoon. We predict solubility for drug parents held out during training. I will introduce the literature and our baseline. Chunsheng will explain the physics-guided SOLAR-H model, Yaorong will explain the ExtraTrees and TabPFN blend, and Haoyang will demonstrate SOLAR Studio."
  },
  "agenda": {
    "time": "0:09 · Jiayun Song",
    "body": "We will start with the baseline, compare two modelling approaches, and finish with the application."
  },
  "unit-1": {
    "time": "0:06 · Jiayun Song",
    "body": "I will start with related work and the baseline."
  },
  "problem": {
    "time": "0:33 · Jiayun Song",
    "body": "ESOL uses a small set of descriptors to estimate aqueous solubility. Vermeire and colleagues combine thermodynamics with machine learning to cover different solvents and temperatures. In our task, the inputs are the two molecular structures and temperature. The output is log base ten molar solubility, and we evaluate on drug parents held out from training."
  },
  "data": {
    "time": "0:39 · Jiayun Song",
    "body": "The dataset contains nineteen hundred and four records, covering forty-nine solvents and one hundred and sixty-one standardised drug parents. The grid shows that more than ninety-two percent of the possible structure and solvent combinations are unmeasured. Sampling is also uneven: the top thirty parents contribute over half the records, while seventy-four parents have only one to five records each. This motivates parent-balanced learning and evaluation."
  },
  "distributions": {
    "time": "0:32 · Jiayun Song",
    "body": "These plots show the observed data. The histogram uses only the development records, while the scatter plot uses the full dataset. Solubility spans more than eight log units. The records also include conflicting measurements under the same nominal conditions. We retain these measurements instead of treating the dataset as perfectly controlled experimental data."
  },
  "protocol": {
    "time": "0:36 · Jiayun Song",
    "body": "RDKit standardises parent identities for grouping. Five outer folds assess generalisation and three inner folds tune the models. Thirty-three parents remain reserved. The basic ExtraTrees model averages randomised tree predictions using twenty-three inputs, including temperature. It reaches a parent MAE of zero point seven four six nine on the development outer folds. Chunsheng will now explain our physics-guided route."
  },
  "unit-2": {
    "time": "0:08 · Chunsheng Yu",
    "body": "I am Chunsheng Yu. I will explain how SOLAR-H models temperature response."
  },
  "solar": {
    "time": "0:44 · Chunsheng Yu",
    "body": "SOLAR-H uses a decomposition inspired by the van ’t Hoff relation. We centre observations within each drug and solvent pair to remove its fixed structural baseline. A weighted ridge regression estimates the temperature response. We subtract the damped temperature term from the target and fit an ExtraTrees model for the remaining structural baseline. Inner validation chooses the gain. The deployed version selects zero, so the explicit temperature term vanishes in that fitted model."
  },
  "solar-ablation": {
    "time": "0:35 · Chunsheng Yu",
    "body": "The ablation tests the importance of temperature shrinkage. Fixing the gain at one raises parent MAE from about zero point seven one six to zero point eight one five. Its paired interval stays above zero. The other ablation intervals cross zero. The clearest finding here is that forcing the full temperature response harms unseen-parent prediction in this experiment."
  },
  "temperature": {
    "time": "0:44 · Chunsheng Yu",
    "body": "Using exactly the same observations, the pooled temperature slope is negative, but the within-pair slope is positive. Pair centring removes fixed differences between drug and solvent combinations. The parent-bootstrap interval for the within-pair slope stays positive. This illustrates how the sampling mix can reverse an overall association. Unmeasured factors that change with temperature may still affect the estimate, so the result remains a conditional association. Yaorong will now introduce our second modelling approach."
  },
  "unit-3": {
    "time": "0:09 · Yaorong Huang",
    "body": "I am Yaorong Huang. I will explain how we improve and combine the two branches."
  },
  "fusion": {
    "time": "0:41 · Yaorong Huang",
    "body": "Our prediction model combines three ideas. First, we construct eight hundred and sixty-nine features from drug and solvent descriptors, temperature, descriptor products and absolute differences. These interactions directly describe the molecule pair. Second, inverse-count weights give each parent equal total influence in tree training. Third, we combine ExtraTrees with TabPFN. Inner out-of-fold predictions determine the convex weights. The deployed example uses seventy-five percent ExtraTrees and twenty-five percent TabPFN."
  },
  "ablation": {
    "time": "0:42 · Yaorong Huang",
    "body": "This progression isolates the main improvement stages under the same outer validation. Rich features and parent weighting reduce parent MAE from zero point seven four six nine to zero point six eight three one. Fusion reduces it further. The blend-versus-basic paired interval lies below zero. However, intervals against the rich single branches cross zero, so we should distinguish the best point estimate from a statistically certain advantage over every competitor."
  },
  "performance": {
    "time": "0:48 · Yaorong Huang",
    "body": "The radar combines the four headline metrics on one page. Error axes are reversed, so farther out is better on every axis. Scores are normalised across the thirteen reported methods. One means the best observed result, not perfect prediction. The blend leads all four point estimates, with parent MAE of zero point six six six eight and R squared of zero point five two three four. Its parent error is ten point seven three percent lower than basic ExtraTrees."
  },
  "sensitivity": {
    "time": "0:38 · Yaorong Huang",
    "body": "The weight curve shows all five tested fixed weights. Intermediate blends perform better than either single-branch endpoint. The dashed line represents the adaptive procedure. Across three seeds, the selected blend changes only slightly. The fold-specific weights on the right also show that the deployment weight is not a universal constant. We do not need to read every value to see this pattern."
  },
  "interpretation": {
    "time": "0:31 · Yaorong Huang",
    "body": "TreeSHAP explains the deployed tree branch. Drug descriptors and explicit interactions have the largest group attributions. This supports the usefulness of describing both the drug and its compatibility with the solvent. The values are in log-solubility units. They are neither percentages nor causal effects. The explanation sample covers all development parents."
  },
  "calibration": {
    "time": "0:33 · Yaorong Huang",
    "body": "These two development examples illustrate how TabPFN changes the tree prediction. For erythritol, the correction moves downward. For the Dane salt, it moves upward. Both follow the same weighted-average formula. These examples explain the blend arithmetic; they are fitted deployment examples, not independent tests of generalisation. Haoyang will now show how we deploy the model."
  },
  "unit-4": {
    "time": "0:09 · Haoyang He",
    "body": "I am Haoyang He. I will show how we deploy and check the predictions."
  },
  "studio": {
    "time": "2:25 · Haoyang He (includes 1:59 video)",
    "body": "FastAPI validates the inputs, loads the model and sends its predictions to the browser. The recording shows single prediction, model comparison, solvent screening and batch CSV. Its first example predicts lovastatin in acetone at twenty-five degrees. I will pause the narration during playback.\n\nPlay the full recording from 0:00. Pause the narration during playback."
  },
  "application-check": {
    "time": "0:35 · Haoyang He",
    "body": "The saved interface checks show agreement between API and offline predictions. Curve and single-point outputs also agree within a small numerical tolerance. The timing dots are five sequential warm requests on the recorded MPS device, averaging about one point seven seconds. They describe that hardware and setup; they do not guarantee the same speed on every computer."
  },
  "error-bands": {
    "time": "0:28 · Haoyang He",
    "body": "We also checked where predictions are least reliable. In this radar, closer to the centre is better. The blend overpredicts the lowest-solubility band by about two point two five log units on average across twenty-three records. Crystal form and lattice energy are missing from the inputs."
  },
  "conclusion": {
    "time": "0:27 · Haoyang He",
    "body": "To conclude, parent-disjoint evaluation makes the prediction task meaningful. Rich interactions, parent weighting and heterogeneous fusion improve the reported development results. The application makes those predictions accessible, while the error analysis identifies clear limits. The next priorities are solid-state information and controlled external validation."
  },
  "thanks": {
    "time": "0:03 · Haoyang He",
    "body": "Thank you for listening."
  }
};
