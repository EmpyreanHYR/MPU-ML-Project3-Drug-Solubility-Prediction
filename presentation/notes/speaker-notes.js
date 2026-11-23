const SOLAR_NOTES = {
  "opening": {
    "time": "0:30",
    "body": "Good afternoon. Our project predicts drug solubility for drug parents that the model has never seen during training. We compare a physics-guided decomposition with an ExtraTrees and TabPFN ensemble, then connect the models to SOLAR Studio. We will focus on the data, the evaluation, the main results and the application."
  },
  "problem": {
    "time": "0:36",
    "body": "Our inputs are the drug structure, the solvent structure and temperature. The output is the base-ten logarithm of molar solubility. A difference of one log unit represents a tenfold concentration difference. This prediction can help prioritise solvent screening and crystallisation experiments. The key challenge is generalisation to a new drug parent, rather than predicting another measurement of a familiar drug."
  },
  "data": {
    "time": "0:39",
    "body": "The dataset contains nineteen hundred and four records, covering forty-nine solvents and one hundred and sixty-one standardised drug parents. The grid shows that more than ninety-two percent of the possible structure and solvent combinations are unmeasured. Sampling is also uneven: the top thirty parents contribute over half the records, while seventy-four parents have only one to five records each. This motivates parent-balanced learning and evaluation."
  },
  "distributions": {
    "time": "0:32",
    "body": "These plots show the observed data. The histogram uses only the development records, while the scatter plot uses the full dataset. Solubility spans more than eight log units. The records also include conflicting measurements under the same nominal conditions. We retain these measurements instead of treating the dataset as perfectly controlled experimental data."
  },
  "protocol": {
    "time": "0:40",
    "body": "We standardise parent identities with RDKit and keep every parent entirely within one split. The development set contains one hundred and twenty-eight parents. A separate group of thirty-three parents remains reserved. Within development, five outer folds estimate performance on unseen parents. Three inner folds select parameters and blend weights. Preprocessing uses training-fold data only. Our headline results are development out-of-fold results, averaged over three training seeds."
  },
  "fusion": {
    "time": "0:41",
    "body": "Our prediction model combines three ideas. First, we construct eight hundred and sixty-nine features from drug and solvent descriptors, temperature, descriptor products and absolute differences. These interactions directly describe the molecule pair. Second, inverse-count weights give each parent equal total influence in tree training. Third, we combine ExtraTrees with TabPFN. Inner out-of-fold predictions determine the convex weights. The deployed example uses seventy-five percent ExtraTrees and twenty-five percent TabPFN."
  },
  "solar": {
    "time": "0:48",
    "body": "SOLAR-H follows a different route. It separates a structural baseline from a structure-dependent temperature term. Within each drug and solvent pair, centring removes the fixed structural component, allowing a weighted ridge model to estimate temperature response. A tree then learns the baseline. Inner validation chooses the temperature gain. The saved deployment selects a gain of zero, so its explicit temperature term vanishes. This is an adaptive response to uncertain extrapolation, rather than evidence that temperature has no physical effect."
  },
  "solar-ablation": {
    "time": "0:35",
    "body": "The ablation tests the importance of temperature shrinkage. Fixing the gain at one raises parent MAE from about zero point seven one six to zero point eight one five. Its paired interval stays above zero. The other ablation intervals cross zero. The clearest finding here is that forcing the full temperature response harms unseen-parent prediction in this experiment."
  },
  "performance": {
    "time": "0:48",
    "body": "The radar combines the four headline metrics on one page. Error axes are reversed, so farther out is better on every axis. Scores are normalised across the thirteen reported methods. One means the best observed result, not perfect prediction. The blend leads all four point estimates, with parent MAE of zero point six six six eight and R squared of zero point five two three four. Its parent error is ten point seven three percent lower than basic ExtraTrees."
  },
  "ablation": {
    "time": "0:42",
    "body": "This progression isolates the main improvement stages under the same outer validation. Rich features and parent weighting reduce parent MAE from zero point seven four six nine to zero point six eight three one. Fusion reduces it further. The blend-versus-basic paired interval lies below zero. However, intervals against the rich single branches cross zero, so we should distinguish the best point estimate from a statistically certain advantage over every competitor."
  },
  "sensitivity": {
    "time": "0:38",
    "body": "The weight curve shows all five tested fixed weights. Intermediate blends perform better than either single-branch endpoint. The dashed line represents the adaptive procedure. Across three seeds, the selected blend changes only slightly. The fold-specific weights on the right also show that the deployment weight is not a universal constant. We do not need to read every value to see this pattern."
  },
  "interpretation": {
    "time": "0:31",
    "body": "TreeSHAP explains the deployed tree branch. Drug descriptors and explicit interactions have the largest group attributions. This supports the usefulness of describing both the drug and its compatibility with the solvent. The values are in log-solubility units. They are neither percentages nor causal effects. The explanation sample covers all development parents."
  },
  "calibration": {
    "time": "0:28",
    "body": "These two development examples illustrate how TabPFN changes the tree prediction. For erythritol, the correction moves downward. For the Dane salt, it moves upward. Both follow the same weighted-average formula. These examples explain the blend arithmetic; they are fitted deployment examples, not independent tests of generalisation."
  },
  "temperature": {
    "time": "0:39",
    "body": "Using exactly the same observations, the pooled temperature slope is negative, but the within-pair slope is positive. Pair centring removes fixed differences between drug and solvent combinations. The parent-bootstrap interval for the within-pair slope stays positive. This illustrates how the sampling mix can reverse an overall association. Unmeasured factors that change with temperature may still affect the estimate, so the result remains a conditional association."
  },
  "error-bands": {
    "time": "0:40",
    "body": "This radar uses raw row MAE, so its direction differs from the earlier performance radar: closer to the centre is better. Both models struggle most in the extremely low-solubility band. For the blend, average overprediction is about two point two five log units across twenty-three records. The input features omit crystal form, packing and lattice energy. These missing solid-state factors are a priority for future work."
  },
  "studio": {
    "time": "2:29",
    "body": "We now show the complete two-minute demonstration. The example predicts lovastatin in acetone at twenty-five degrees. The recorded output is approximately zero point one eight seven five moles per litre. The video demonstrates point prediction, model comparison, solvent screening and batch input. I will pause the narration while it plays."
  },
  "application-check": {
    "time": "0:35",
    "body": "The saved interface checks show agreement between API and offline predictions. Curve and single-point outputs also agree within a small numerical tolerance. The timing dots are five sequential warm requests on the recorded MPS device, averaging about one point seven seconds. They describe that hardware and setup; they do not guarantee the same speed on every computer."
  },
  "conclusion": {
    "time": "0:30",
    "body": "To conclude, parent-disjoint evaluation makes the prediction task meaningful. Rich interactions, parent weighting and heterogeneous fusion improve the reported development results. The application makes those predictions accessible, while the error analysis identifies clear limits. The next priorities are solid-state information and controlled external validation. Thank you. We welcome your questions."
  },
  "backup-models": {
    "time": "Q&A",
    "body": "Reference page only. Do not include in the timed presentation."
  },
  "backup-details": {
    "time": "Q&A",
    "body": "Reference page only. Do not include in the timed presentation."
  }
};
