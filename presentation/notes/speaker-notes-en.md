# English presentation script

Estimated runtime 14:05 at 100 words per minute, including the full 1:59 video and 45 seconds for transitions.

## 01 Research overview

Jiayun Song · 41 spoken words · 0:25

Good afternoon. We predict solubility for drug parents held out during training. I will introduce the literature and our baseline. Chunshen will explain the physics-guided SOLAR-H model, Yaorong will explain the ExtraTrees and TabPFN blend, and Haoyang will demonstrate SOLAR Studio.

## 02 Presentation roadmap

Jiayun Song · 15 spoken words · 0:09

We will start with the baseline, compare two modelling approaches, and finish with the application.

## 03 Literature and baselines

Jiayun Song · 9 spoken words · 0:06

I will start with related work and the baseline.

## 04 Predicting solubility across conditions

Jiayun Song · 55 spoken words · 0:33

ESOL uses a small set of descriptors to estimate aqueous solubility. Vermeire and colleagues combine thermodynamics with machine learning to cover different solvents and temperatures. In our task, the inputs are the two molecular structures and temperature. The output is log base ten molar solubility, and we evaluate on drug parents held out from training.

## 05 Sparse coverage and uneven sampling shape the task

Jiayun Song · 65 spoken words · 0:39

The dataset contains nineteen hundred and four records, covering forty-nine solvents and one hundred and sixty-one standardised drug parents. The grid shows that more than ninety-two percent of the possible structure and solvent combinations are unmeasured. Sampling is also uneven: the top thirty parents contribute over half the records, while seventy-four parents have only one to five records each. This motivates parent-balanced learning and evaluation.

## 06 Temperature and solubility span broad ranges

Jiayun Song · 53 spoken words · 0:32

These plots show the observed data. The histogram uses only the development records, while the scatter plot uses the full dataset. Solubility spans more than eight log units. The records also include conflicting measurements under the same nominal conditions. We retain these measurements instead of treating the dataset as perfectly controlled experimental data.

## 07 Drug parents stay isolated across folds

Jiayun Song · 59 spoken words · 0:36

RDKit standardises parent identities for grouping. Five outer folds assess generalisation and three inner folds tune the models. Thirty-three parents remain reserved. The basic ExtraTrees model averages randomised tree predictions using twenty-three inputs, including temperature. It reaches a parent MAE of zero point seven four six nine on the development outer folds. Chunshen will now explain our physics-guided route.

## 08 Method 1 · SOLAR-H

Chunshen Yu · 12 spoken words · 0:08

I am Chunshen Yu. I will explain how SOLAR-H models temperature response.

## 09 SOLAR-H separates structure and temperature

Chunshen Yu · 73 spoken words · 0:44

SOLAR-H uses a decomposition inspired by the van ’t Hoff relation. We centre observations within each drug and solvent pair to remove its fixed structural baseline. A weighted ridge regression estimates the temperature response. We subtract the damped temperature term from the target and fit an ExtraTrees model for the remaining structural baseline. Inner validation chooses the gain. The deployed version selects zero, so the explicit temperature term vanishes in that fitted model.

## 10 Full temperature gain increases SOLAR-H error

Chunshen Yu · 58 spoken words · 0:35

The ablation tests the importance of temperature shrinkage. Fixing the gain at one raises parent MAE from about zero point seven one six to zero point eight one five. Its paired interval stays above zero. The other ablation intervals cross zero. The clearest finding here is that forcing the full temperature response harms unseen-parent prediction in this experiment.

## 11 Pair controls reverse the temperature association

Chunshen Yu · 73 spoken words · 0:44

Using exactly the same observations, the pooled temperature slope is negative, but the within-pair slope is positive. Pair centring removes fixed differences between drug and solvent combinations. The parent-bootstrap interval for the within-pair slope stays positive. This illustrates how the sampling mix can reverse an overall association. Unmeasured factors that change with temperature may still affect the estimate, so the result remains a conditional association. Yaorong will now introduce our second modelling approach.

## 12 Method 2 · ExtraTrees–TabPFN

Yaorong Huang · 15 spoken words · 0:09

I am Yaorong Huang. I will explain how we improve and combine the two branches.

## 13 Interactions, parent weighting and heterogeneous fusion

Yaorong Huang · 68 spoken words · 0:41

Our prediction model combines three ideas. First, we construct eight hundred and sixty-nine features from drug and solvent descriptors, temperature, descriptor products and absolute differences. These interactions directly describe the molecule pair. Second, inverse-count weights give each parent equal total influence in tree training. Third, we combine ExtraTrees with TabPFN. Inner out-of-fold predictions determine the convex weights. The deployed example uses seventy-five percent ExtraTrees and twenty-five percent TabPFN.

## 14 Feature enhancement and fusion lower parent error

Yaorong Huang · 70 spoken words · 0:42

This progression isolates the main improvement stages under the same outer validation. Rich features and parent weighting reduce parent MAE from zero point seven four six nine to zero point six eight three one. Fusion reduces it further. The blend-versus-basic paired interval lies below zero. However, intervals against the rich single branches cross zero, so we should distinguish the best point estimate from a statistically certain advantage over every competitor.

## 15 The blend leads the four reported metrics

Yaorong Huang · 79 spoken words · 0:48

The radar combines the four headline metrics on one page. Error axes are reversed, so farther out is better on every axis. Scores are normalised across the thirteen reported methods. One means the best observed result, not perfect prediction. The blend leads all four point estimates, with parent MAE of zero point six six six eight and R squared of zero point five two three four. Its parent error is ten point seven three percent lower than basic ExtraTrees.

## 16 Blend gains persist across tested weights and seeds

Yaorong Huang · 62 spoken words · 0:38

The weight curve shows all five tested fixed weights. Intermediate blends perform better than either single-branch endpoint. The dashed line represents the adaptive procedure. Across three seeds, the selected blend changes only slightly. The fold-specific weights on the right also show that the deployment weight is not a universal constant. We do not need to read every value to see this pattern.

## 17 Drug structure and pair interactions dominate TreeSHAP

Yaorong Huang · 51 spoken words · 0:31

TreeSHAP explains the deployed tree branch. Drug descriptors and explicit interactions have the largest group attributions. This supports the usefulness of describing both the drug and its compatibility with the solvent. The values are in log-solubility units. They are neither percentages nor causal effects. The explanation sample covers all development parents.

## 18 TabPFN adjusts the tree prediction in both directions

Yaorong Huang · 55 spoken words · 0:33

These two development examples illustrate how TabPFN changes the tree prediction. For erythritol, the correction moves downward. For the Dane salt, it moves upward. Both follow the same weighted-average formula. These examples explain the blend arithmetic; they are fitted deployment examples, not independent tests of generalisation. Haoyang will now show how we deploy the model.

## 19 Application · SOLAR Studio

Haoyang He · 14 spoken words · 0:09

I am Haoyang He. I will show how we deploy and check the predictions.

## 20 SOLAR Studio in action

Haoyang He · 43 spoken words · 2:25 including the full 1:59 video

FastAPI validates the inputs, loads the model and sends its predictions to the browser. The recording shows single prediction, model comparison, solvent screening and batch CSV. Its first example predicts lovastatin in acetone at twenty-five degrees. I will pause the narration during playback.

**[Play the full recording from 0:00. Pause the narration during playback.]**

## 21 Saved API checks match offline predictions

Haoyang He · 57 spoken words · 0:35

The saved interface checks show agreement between API and offline predictions. Curve and single-point outputs also agree within a small numerical tolerance. The timing dots are five sequential warm requests on the recorded MPS device, averaging about one point seven seconds. They describe that hardware and setup; they do not guarantee the same speed on every computer.

## 22 Very low solubility remains the main weakness

Haoyang He · 46 spoken words · 0:28

We also checked where predictions are least reliable. In this radar, closer to the centre is better. The blend overpredicts the lowest-solubility band by about two point two five log units on average across twenty-three records. Crystal form and lattice energy are missing from the inputs.

## 23 Reliable evaluation, better predictions and a usable system

Haoyang He · 44 spoken words · 0:27

To conclude, parent-disjoint evaluation makes the prediction task meaningful. Rich interactions, parent weighting and heterogeneous fusion improve the reported development results. The application makes those predictions accessible, while the error analysis identifies clear limits. The next priorities are solid-state information and controlled external validation.

## 24 Thank you

Haoyang He · 4 spoken words · 0:03

Thank you for listening.
