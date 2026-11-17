/*
 * Standalone learning centre. No network or external dependencies.
 * Public API: LearningStudio.render(container), markTask(key), getProgress().
 * Styling hooks: .learn-section, .learn-header, .learn-kicker, .learn-grid,
 * .learn-flow, .learn-node[aria-pressed="true"], .learn-node-number,
 * .learn-concept, .learn-formula, .learn-note, .learn-columns, .learn-subtitle,
 * .task-list, .task-item.is-complete, .task-copy, .task-progress,
 * .quiz-header, .quiz-score, .quiz-progress, .quiz-question,
 * .quiz-options, .quiz-option.is-correct/.is-wrong/[aria-pressed="true"],
 * .quiz-letter, .quiz-feedback.is-correct/.is-wrong, .quiz-actions,
 * .quiz-nav, .quiz-reset, .quiz-summary, .learn-glossary, .learn-term.
 * Existing .card, .eyebrow, .secondary, .primary may be reused by host CSS.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'solar-learning-v1';
  const tasks = [
    { key: 'predict', title: '完成一次分子预测', en: 'Make a prediction', text: '选择一个药物–溶剂组合，读出 log₁₀ S，并查看结构基线与温度分量。' },
    { key: 'explore', title: '探索温度与溶剂', en: 'Explore conditions', text: '固定药物，改变温度或溶剂。记录趋势，并检查输入是否超出开发集范围。' },
    { key: 'compare', title: '用证据比较模型', en: 'Compare with evidence', text: '对相同条件运行两种模型，结合母体 MAE 讨论预测差异与推广能力。' }
  ];
  const concepts = [
    {
      title: '结构输入', en: 'Molecular inputs',
      lead: '从药物和溶剂结构开始。',
      text: '模型把药物与溶剂的分子结构转为描述符，再结合温度进行预测。母体分组标识用于训练与评价组织，不作为预测时的输入特征。',
      formula: '(drug structure, solvent structure, T) → ŷ',
      note: '思考：若只记住药物名称，模型能否可靠预测未见药物？'
    },
    {
      title: '分子交互', en: 'Molecular interactions',
      lead: '同时描述两个分子及其关系。',
      text: '主方法将TabPFN与ExtraTrees的预测按内层验证权重组合，完整开发集导出权重为0.25和0.75。作为对照，SOLAR-H 将药物描述符、溶剂描述符、对应乘积与绝对差拼接为交互表示。SOLAR-N 先用双编码器得到表示，再构建交互。它们帮助模型学习同一种药物在不同溶剂中的差异。',
      formula: 'z = [xdrug; xsolvent; xdrug ⊙ xsolvent; |xdrug − xsolvent|]',
      note: '交互表示是可检验的设计选择，其价值需要通过对照和消融实验评估。'
    },
    {
      title: '条件分解', en: 'Baseline + response',
      lead: '把结构基线与温度响应分开看。',
      text: '主融合模型不采用结构—温度分解。对比模型SOLAR-H 将预测拆成参考温度下的结构基线 b(z) 与温度贡献 γτr(z)。τ 是按训练折统计量缩放后的温度，γ 由内层分组验证选择；若 γ=0，温度分量会被关闭，曲线可呈平坦。',
      formula: 'ŷ = b(z) + γτr(z)',
      note: '曲线反映模型学习到的关联，不能直接解释为温度的因果效应。'
    },
    {
      title: '分组验证', en: 'Grouped validation',
      lead: '检验面对未见母体时的表现。',
      text: '外层按药物母体分组评价，内层分组选择超参数；预处理只在相应训练折拟合。这样可避免同一母体的相关记录同时进入训练与验证，从而更贴近跨母体推广任务。',
      formula: '外层 5 折 × 内层 3 折 · seeds 2026 / 17 / 42',
      note: '母体 MAE 先在每个母体内平均绝对误差，再对母体等权平均。'
    }
  ];
  const questions = [
    {
      title: '哪种误差指标对少数较大的预测误差更敏感？',
      en: 'Which metric is more sensitive to large errors?',
      options: ['MAE：平均绝对误差', 'RMSE：均方根误差', '两者始终完全一样'],
      correct: 1,
      explanation: 'RMSE 在平均前先对误差平方，因此大误差的影响更强。MAE 直接平均绝对误差，单位与预测目标一致；本项目另用母体 MAE 让每个母体在汇总时具有相同权重。',
      takeaway: '比较指标前，先确认汇总对象与评价划分一致。'
    },
    {
      title: '为什么本项目按药物母体分组划分训练与验证？',
      en: 'Why split by parent molecule?',
      options: ['让验证集包含更多训练集的重复结构', '让每折拥有完全相同的温度', '避免相关母体记录跨集合泄漏，检验未见母体的推广能力'],
      correct: 2,
      explanation: '同一母体可能在多个溶剂和温度下有相关观测。逐行随机划分容易让相关记录跨集合，得到偏乐观的评价。母体分组让外层验证母体与训练母体分离，内层再负责模型选择。',
      takeaway: '数据划分应与希望推广到的新对象一致。'
    },
    {
      title: '预测 log₁₀ S 从 −3 变为 −2，反变换后的 S 如何变化？',
      en: 'How does a one-unit log₁₀ increase change S?',
      options: ['变为原来的 10 倍', '变为原来的 2 倍', '变为原来的 1/10'],
      correct: 0,
      explanation: '10⁻² ÷ 10⁻³ = 10。log₁₀ 尺度上相差 1，对应原尺度相差 10 倍。反变换不改变数据本身的浓度定义，读取结果时仍要核对数据集单位。',
      takeaway: '对数尺度的差值可以转换为原尺度的倍数。'
    },
    {
      title: '温度响应图呈上升趋势，最合理的表述是什么？',
      en: 'What can a rising temperature curve support?',
      options: ['已证明升温一定会提高所有药物的溶解度', '此模型在所选组合与范围内预测了上升关联', '只要在图中看到曲线，就不必再检查数据范围'],
      correct: 1,
      explanation: '响应图是在固定结构、改变输入温度时得到的模型预测。它受训练数据覆盖与模型假设限制，不能单凭曲线证明因果关系。SOLAR-H 的温度增益还可能收缩到 0，因此平坦曲线也可能符合模型设计。',
      takeaway: '区分预测趋势、观测证据与因果结论。'
    },
    {
      title: '模型的交叉验证 MAE 为 0.72，能否给每次预测画出 ±0.72 的 95% 置信区间？',
      en: 'Is MAE a per-prediction confidence interval?',
      options: ['能，MAE 就是 95% 区间半径', '能，只要把区间标成绿色', '不能；MAE 是平均误差，不是经过校准的单点区间'],
      correct: 2,
      explanation: 'MAE 汇总一组预测的绝对误差，既不规定误差分布，也不保证单个预测的覆盖率。要报告 95% 预测区间，需要额外的方法和覆盖率验证；适用域提示与多模型分歧同样不等于概率置信度。',
      takeaway: '0.72 仅为题目中的示例数值，不代表界面当前所选模型的指标。'
    }
  ];
  const glossary = [
    ['SMILES', '用文本编码分子结构的表达方式。界面的分子图由结构数据生成。'],
    ['log₁₀ S', '溶解度的以 10 为底对数；相差 1 对应原尺度相差 10 倍。'],
    ['母体 MAE · Parent MAE', '先求每个药物母体的平均绝对误差，再对母体等权平均。越低越好。'],
    ['R² · 决定系数', '相对目标均值基线衡量拟合表现。越高通常越好，也可能为负值。'],
    ['适用域 · Applicability', '依据已有数据覆盖判断输入与开发数据的接近程度，不是预测准确率。'],
    ['嵌套验证 · Nested CV', '内层用于模型与超参数选择，外层用于评价该选择流程的推广误差。']
  ];

  let state = { answers: Array(questions.length).fill(null), tasks: {}, active: 0, concept: 0 };
  let host = null;

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (Array.isArray(saved.answers)) state.answers = questions.map((q, i) => Number.isInteger(saved.answers[i]) && saved.answers[i] >= 0 && saved.answers[i] < q.options.length ? saved.answers[i] : null);
      state.tasks = Object.fromEntries(tasks.map(t => [t.key, saved.tasks?.[t.key] === true]));
      if (Number.isInteger(saved.active)) state.active = Math.max(0, Math.min(questions.length - 1, saved.active));
    } catch (_) { /* Private browsing or unavailable storage: keep this session usable. */ }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers, tasks: state.tasks, active: state.active })); } catch (_) { /* Optional persistence. */ }
  }
  function getProgress() {
    return {
      answered: state.answers.filter(v => v !== null).length,
      correct: state.answers.filter((v, i) => v === questions[i].correct).length,
      total: questions.length,
      tasks: Object.fromEntries(tasks.map(t => [t.key, state.tasks[t.key] === true])),
      completedTasks: tasks.filter(t => state.tasks[t.key]).length
    };
  }
  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function small(text) { return make('small', '', text); }

  function renderConcept() {
    const target = host?.querySelector('[data-learning="concept"]');
    if (!target) return;
    const c = concepts[state.concept];
    target.replaceChildren();
    target.append(make('h3', '', c.lead), make('p', '', c.text), make('div', 'learn-formula', c.formula), make('p', 'learn-note', c.note));
    host.querySelectorAll('[data-concept]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.concept) === state.concept)));
  }

  function renderTasks() {
    const list = host?.querySelector('[data-learning="tasks"]');
    if (!list) return;
    list.replaceChildren();
    tasks.forEach((task, i) => {
      const label = make('label', 'task-item' + (state.tasks[task.key] ? ' is-complete' : ''));
      const input = make('input');
      input.type = 'checkbox';
      input.checked = state.tasks[task.key] === true;
      input.setAttribute('aria-label', task.title);
      input.addEventListener('change', () => {
        state.tasks[task.key] = input.checked;
        saveState();
        renderTasks();
        const replacement = host?.querySelector(`[data-task="${task.key}"]`);
        replacement?.focus({ preventScroll: true });
      });
      input.dataset.task = task.key;
      const copy = make('span', 'task-copy');
      copy.append(make('strong', '', `${String(i + 1).padStart(2, '0')}  ${task.title}`), small(task.en), make('span', '', task.text));
      label.append(input, copy);
      list.append(label);
    });
    const count = getProgress().completedTasks;
    const progress = host.querySelector('[data-learning="task-progress"]');
    progress.textContent = `${count} / ${tasks.length} 项已完成`;
  }

  function renderQuiz() {
    const target = host?.querySelector('[data-learning="quiz"]');
    if (!target) return;
    const q = questions[state.active];
    const answer = state.answers[state.active];
    const p = getProgress();
    target.replaceChildren();

    const header = make('div', 'quiz-header');
    const heading = make('div');
    heading.append(make('span', 'learn-kicker', `QUESTION ${String(state.active + 1).padStart(2, '0')} / ${String(questions.length).padStart(2, '0')}`));
    const score = make('span', 'quiz-score', `答对 ${p.correct} / ${questions.length}`);
    score.setAttribute('aria-label', `共 ${questions.length} 题，已答对 ${p.correct} 题`);
    header.append(heading, score);
    target.append(header);

    const progress = make('progress', 'quiz-progress');
    progress.value = p.answered;
    progress.max = questions.length;
    progress.setAttribute('aria-label', `已完成 ${p.answered} / ${questions.length} 题`);
    target.append(progress);

    const question = make('h3', 'quiz-question', q.title);
    question.id = 'solar-quiz-question';
    question.tabIndex = -1;
    question.append(small(q.en));
    target.append(question);
    const options = make('div', 'quiz-options');
    options.setAttribute('role', 'group');
    options.setAttribute('aria-labelledby', question.id);
    q.options.forEach((text, index) => {
      const isChosen = answer === index;
      const answered = answer !== null;
      const status = answered && index === q.correct ? ' is-correct' : answered && isChosen ? ' is-wrong' : '';
      const button = make('button', 'quiz-option' + status);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(isChosen));
      // Keep controls focusable after answering, while locking the first answer.
      button.setAttribute('aria-disabled', String(answered));
      button.append(make('span', 'quiz-letter', String.fromCharCode(65 + index)), make('span', '', text));
      if (answered && index === q.correct) button.append(make('span', 'quiz-status', '✓ 正确答案'));
      else if (answered && isChosen) button.append(make('span', 'quiz-status', '× 你的选择'));
      button.addEventListener('click', () => {
        if (state.answers[state.active] !== null) return;
        state.answers[state.active] = index;
        saveState();
        renderQuiz();
        host.querySelector('[data-learning="feedback"]')?.focus({ preventScroll: true });
      });
      options.append(button);
    });
    target.append(options);

    if (answer !== null) {
      const right = answer === q.correct;
      const feedback = make('div', 'quiz-feedback' + (right ? ' is-correct' : ' is-wrong'));
      feedback.dataset.learning = 'feedback';
      feedback.setAttribute('role', 'status');
      feedback.tabIndex = -1;
      feedback.append(make('strong', '', right ? '回答正确 · Correct' : '再看一下原理 · Learn from this'), make('p', '', q.explanation), small(q.takeaway));
      target.append(feedback);
    } else {
      target.append(make('p', 'learn-note', '选择一个答案，立即查看解释。首次选择会保存；可在完成后重置练习。'));
    }

    if (p.answered === questions.length) {
      const summary = make('div', 'quiz-summary');
      summary.append(make('strong', '', `已完成全部练习 · ${p.correct} / ${questions.length} 题正确`), make('p', '', '回到实验室，用实际预测与分组评价解释你的答案。练习进度仅保存在当前浏览器。'));
      target.append(summary);
    }
    const actions = make('div', 'quiz-actions');
    const previous = make('button', 'quiz-nav secondary', '← 上一题');
    previous.type = 'button';
    previous.disabled = state.active === 0;
    previous.addEventListener('click', () => changeQuestion(state.active - 1));
    const counter = make('span', 'learn-note', `已作答 ${p.answered} / ${questions.length}`);
    const next = make('button', 'quiz-nav secondary', state.active === questions.length - 1 ? '返回首题 ↺' : '下一题 →');
    next.type = 'button';
    next.addEventListener('click', () => changeQuestion((state.active + 1) % questions.length));
    actions.append(previous, counter, next);
    target.append(actions);
  }
  function changeQuestion(index) {
    state.active = index;
    saveState();
    renderQuiz();
    const question = host?.querySelector('.quiz-question');
    if (question) {
      question.tabIndex = -1;
      question.focus({ preventScroll: true });
    }
  }
  function markTask(key) {
    if (!tasks.some(t => t.key === key)) return;
    state.tasks[key] = true;
    saveState();
    renderTasks();
    window.dispatchEvent(new CustomEvent('solar:learning-progress', { detail: getProgress() }));
  }
  function resetQuiz() {
    state.answers = Array(questions.length).fill(null);
    state.active = 0;
    saveState();
    renderQuiz();
    host?.querySelector('.quiz-question')?.focus({ preventScroll: true });
  }

  function render(container) {
    if (!(container instanceof Element)) return;
    host = container;
    host.replaceChildren();

    const overview = make('section', 'card learn-section');
    const head = make('div', 'learn-header');
    const title = make('div');
    title.append(make('p', 'eyebrow learn-kicker', 'UNDERSTAND THE MODEL'), make('h2', '', '从分子结构到可信评价'), make('p', 'learn-subtitle', '点击一个步骤，理解主融合模型与SOLAR 对照的设计与验证方式。'));
    head.append(title);
    overview.append(head);
    const flow = make('div', 'learn-flow');
    flow.setAttribute('role', 'group');
    flow.setAttribute('aria-label', '模型学习流程');
    concepts.forEach((concept, index) => {
      const button = make('button', 'learn-node');
      button.type = 'button';
      button.dataset.concept = String(index);
      button.setAttribute('aria-controls', 'solar-learn-concept');
      button.append(make('span', 'learn-node-number', String(index + 1).padStart(2, '0')), make('strong', '', concept.title), small(concept.en));
      button.addEventListener('click', () => { state.concept = index; renderConcept(); });
      flow.append(button);
    });
    overview.append(flow);
    const concept = make('div', 'learn-concept');
    concept.dataset.learning = 'concept';
    concept.id = 'solar-learn-concept';
    concept.setAttribute('aria-live', 'polite');
    overview.append(concept);
    host.append(overview);

    const columns = make('div', 'learn-columns');
    const taskCard = make('section', 'card learn-section');
    taskCard.append(make('p', 'eyebrow learn-kicker', 'LEARN BY DOING'), make('h2', '', '三步完成一次探索'), make('p', 'learn-subtitle', '实验完成后自动记录，也可以手动勾选。'));
    const taskProgress = make('p', 'task-progress');
    taskProgress.dataset.learning = 'task-progress';
    taskProgress.setAttribute('aria-live', 'polite');
    taskCard.append(taskProgress);
    const taskList = make('div', 'task-list');
    taskList.dataset.learning = 'tasks';
    taskCard.append(taskList, make('p', 'learn-note', '记录保存在当前浏览器，无需账号。'));
    columns.append(taskCard);

    const quiz = make('section', 'card learn-section');
    const quizHead = make('div', 'learn-header');
    const quizTitle = make('div');
    quizTitle.append(make('p', 'eyebrow learn-kicker', 'CHECK YOUR UNDERSTANDING'), make('h2', '', '五题理解关键概念'));
    const reset = make('button', 'quiz-reset secondary', '重置小测');
    reset.type = 'button';
    reset.addEventListener('click', resetQuiz);
    quizHead.append(quizTitle, reset);
    const quizBody = make('div');
    quizBody.dataset.learning = 'quiz';
    quiz.append(quizHead, quizBody);
    columns.append(quiz);
    host.append(columns);

    const glossaryCard = make('section', 'card learn-section');
    glossaryCard.append(make('p', 'eyebrow learn-kicker', 'A SMALL FIELD GUIDE'), make('h2', '', '随手查阅的术语卡'));
    const terms = make('dl', 'learn-glossary');
    glossary.forEach(([term, definition]) => {
      const item = make('div', 'learn-term');
      item.append(make('dt', '', term), make('dd', '', definition));
      terms.append(item);
    });
    glossaryCard.append(terms);
    host.append(glossaryCard);
    renderConcept();
    renderTasks();
    renderQuiz();
  }

  readState();
  window.LearningStudio = Object.freeze({ render, markTask, getProgress });
})();
