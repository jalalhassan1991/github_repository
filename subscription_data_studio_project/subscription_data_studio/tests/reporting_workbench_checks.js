window.runStudioBenchmark = () => {
  void(async () => {
    const log = t => window.webkit.messageHandlers.benchmark.postMessage(t),
      checks = [],
      sleep = ms => new Promise(r => setTimeout(r, ms));

    function check(name, ok) {
      if (!ok) throw Error(name);
      checks.push(name);
    }
    check('Resolution and orientation controls removed', !$('reportResolution') && !$(
      'reportOrientation') && !$('reportCanvasView'));
    check('Align Selected and old Sheet Parameters removed', !$(
        'reportAlignment') && !
      document.querySelector('.sheet-parameter-panel'));
    check('Thirty-eight named palettes are available', REPORT_PASTEL_PALETTES.length ===
      38 && new Set(REPORT_PASTEL_PALETTES.map(p => p.id)).size === 38);
    check('Palette previews are built into dropdown choices', renderPalettePicker(
        'berry_cream').includes('data-palette-choice="berry_cream"') &&
      renderPalettePicker('berry_cream').includes('palette-color-strip'));
    check('Sidebar width migration increases old widths by half', restoredSidebarWidth(240,
      2) === 360 && restoredSidebarWidth(320, 2) === 480);
    check('New sidebar widths do not migrate a second time', restoredSidebarWidth(360,
      3) === 360);
    check('Initial sidebar instruction removed', !$('reportStatus').textContent.includes(
      'Generate a dataset first, then'));
    const fittedScale = reportValueScale([1000, 1002, 1005], {
      includeZero: false
    });
    check('Linear value scale fits nonzero data without wasted zero baseline', fittedScale
      .min > 990 && fittedScale.max < 1010);
    const barScale = reportValueScale([1000, 1005], {
      includeZero: true
    });
    check('Bar value scale retains zero baseline', barScale.min === 0);
    const negativeScale = reportValueScale([-55, -51], {
      includeZero: false
    });
    check('Negative and constant values have finite fitted ranges', negativeScale.max < 0 &&
      Number.isFinite(reportValueScale([42, 42]).ratio(42)));
    const logScale = reportValueScale([1, 10, 100], {
      axisScale: 'log'
    });
    check('Logarithmic scale places powers of ten at equal distances', Math.abs((logScale
        .ratio(10) - logScale.ratio(1)) - (logScale.ratio(100) - logScale.ratio(10))) <
      1e-10);
    check('Log scale rejects zero and negative facts explicitly', !!reportValueScale([0,
      1
    ], {
      axisScale: 'log'
    }).error && !!reportValueScale([-1, 1], {
      axisScale: 'log'
    }).error);
    check('Bold palettes replace pale colors', REPORT_PASTEL_PALETTES.every(p => p.colors
      .every(c => colorHexToHsl(c)[2] < .65)));
    const croppedScale = reportValueScale([10, 40, 50], {
      valueAxisMinimum: 30,
      autoFitValueAxis: true
    });
    check('Explicit value-axis minimum overrides automatic lower bound', croppedScale
      .min === 30 && croppedScale.ratio(10) < 0);
    check('Starting tick honors explicit minimum with a custom interval', croppedScale
      .ticks(20)[0] === 30);
    check('Auto-fit toggle can restore a zero baseline', reportValueScale([100, 110], {
      autoFitValueAxis: false
    }).min === 0 && reportValueScale([100, 110], {
      autoFitValueAxis: true
    }).min > 90);
    check('Log minimum rejects nonpositive input', !!reportValueScale([1, 10], {
      axisScale: 'log',
      valueAxisMinimum: 0
    }).error);
    check('Minimum above all values explains the empty view', reportValueScale([10, 20], {
      valueAxisMinimum: 30
    }).error.includes('below'));
    const guide = functionDictionaryEntries();
    check('Function Dictionary covers all user functions', Object.keys(SQL_FUNCTIONS)
      .filter(n => !n.startsWith('SQL_')).every(n => guide.some(e => e.name === n)));
    log('GUIDE_ERRORS:' + JSON.stringify(guide.filter(e => e.stage === 'Row' &&
      functionExampleOutput(e).startsWith('Example error:')).map(e => ({
      name: e.name,
      error: functionExampleOutput(e)
    }))));
    check('Function examples execute successfully', guide.filter(e => e.stage === 'Row')
      .every(e => !functionExampleOutput(e).startsWith('Example error:')));
    const parsed = parseParameterDefinitions(
      `parameter: scale {\n type: number\n default: 2\n min: 0\n max: 10\n}\nmeasure: count {\n type: sum\n sql: 1 ;;\n}`
    );
    check('Parameter parser retains measure', parsed.parameters[0].default === 2 && parsed
      .text.includes('measure: count'));
    let rejected = false;
    try {
      parameterValue(parsed.parameters[0], {
        scale: 20
      })
    } catch {
      rejected = true
    }
    check('Parameter bounds enforced', rejected);
    make({
      count: 300,
      hist: 1825,
      masterSeed: 3280873347,
      now: '2026-11-23T12:00:00Z',
      options: {
        optDiscount: true,
        optFailures: true,
        optChanges: true,
        optCancels: true,
        optOneTime: true,
        optChargebacks: true,
        distributionMode: 'weighted'
      }
    });
    while ($('generate').disabled) await sleep(10);
    const text =
      `parameter: scale {\n type: number\n default: 2\n min: 0\n max: 10\n}\ndimension: state {\n label: "Geography"\n type: string\n sql: \${user_records.state} ;;\n}\ndate: start_date {\n type: date\n sql: date(\${subscription_records.subscription_start_ts}) ;;\n}\nmeasure: subscriptions {\n type: sum\n fact_table: subscription_records\n sql: 1 ;;\n}\nmeasure: scaled {\n type: sum\n fact_table: subscription_records\n sql: PARAMETER('scale') ;;\n}\nmeasure: reactivations {\n type: sum\n sql: CASE WHEN \${subscription_records.subscription_type}='reactivation' THEN 1 ELSE 0 END ;;\n}`;
    const definitions = resolveLookmlDefinitions(text +
      `\nmeasure: derived {\n type: number\n sql: {{subscriptions}} * PARAMETER('scale') ;;\n value_format: numeric\n}`
    );
    customAttributes = definitions.dimensions;
    customMetrics = definitions.measures;
    $('definitionEditor').value = text;
    check('Parameter survives serialization', serializeLookmlDefinitions().includes(
      'parameter: scale'));
    check('Parameter default evaluates', evaluateExpression("PARAMETER('scale')", {}) ===
      2);
    check('Query parameter overrides default', evaluateExpression("PARAMETER('scale')", {
      __parameters: {
        scale: 3
      }
    }) === 3);
    check('Parameter-looking text stays a literal', evaluateExpression(
      "'PARAMETER(\"scale\")'", {}) === 'PARAMETER("scale")');
    const metric = name => customMetrics.find(m => m.lookmlName === name).id,
      dim = name => customAttributes.find(m => m.lookmlName === name).id;
    const one = {
      id: 'one',
      name: 'One',
      gridVersion: REPORT_GRID.version,
      colSpan: 8,
      rowSpan: 25,
      config: {
        chartType: 'metric_card',
        xFields: [],
        yFields: [{
          kind: 'metric',
          id: metric('subscriptions')
        }, {
          kind: 'metric',
          id: metric('scaled')
        }],
        compare: 'none',
        dateFilters: [],
        dateFiltersDraft: [],
        dateFilterUiVersion: 2
      }
    };
    reportSheets = [{
      id: 'sheet_test',
      name: 'Test',
      widgets: [one]
    }];
    activeSheetId = 'sheet_test';
    setReportView('reporting');
    renderSheet();
    check('Canvas has exactly 12 columns', getComputedStyle($('reportCharts'))
      .gridTemplateColumns.split(' ').length === 12);
    const oldLayout = {
      gridVersion: 2,
      colSpan: 12,
      rowSpan: 18,
      gridColumn: 13,
      gridRow: 7
    };
    normalizeGridWidget(oldLayout);
    check('24-column layouts migrate proportionally', oldLayout.colSpan === 6 && oldLayout
      .gridColumn === 7 && oldLayout.rowSpan === 18 && oldLayout.gridRow === 7);
    const sixteenLayout = {
      gridVersion: 3,
      colSpan: 8,
      rowSpan: 18,
      gridColumn: 9,
      gridRow: 3
    };
    normalizeGridWidget(sixteenLayout);
    check('Saved sixteen-column layouts migrate to twelve columns', sixteenLayout
      .colSpan === 6 && sixteenLayout.gridColumn === 7 && sixteenLayout.rowSpan === 18);
    const once = JSON.stringify(oldLayout);
    normalizeGridWidget(oldLayout);
    check('Grid migration is applied only once', JSON.stringify(oldLayout) === once);
    check('Twelve-column canvas retains original cell width', Math.abs($('reportCharts')
      .getBoundingClientRect().width - 958.5) < 1);
    check('Grid cells do not stretch to fill the reporting area', Math.abs(parseFloat(
        getComputedStyle($('reportCharts')).gridTemplateColumns.split(' ')[0]) - 74.375) <
      1);
    check('Sheet toolbar matches the canvas frame width', Math.abs(document.querySelector(
        '.sheet-toolbar').getBoundingClientRect().width - $('reportCanvasScroll')
      .getBoundingClientRect().width) < 1);
    check('Report container stops at the fixed canvas width', document.querySelector(
      '.report-results').getBoundingClientRect().width <= 985);
    check('Undo and Redo buttons removed', !$('reportUndo') && !$('reportRedo'));
    check('Sheet management actions align left', getComputedStyle(document.querySelector(
      '.sheet-actions')).justifyContent === 'flex-start');
    check('Report actions remain a single top-right row', getComputedStyle(document
        .querySelector('.sheet-actions-secondary')).flexWrap === 'nowrap' &&
      getComputedStyle(document.querySelector('.sheet-actions-secondary'))
      .justifyContent === 'flex-end');
    const sheetTabsRect = $('reportSheetTabs').getBoundingClientRect(),
      managementRect = $('addReportSheet').getBoundingClientRect(),
      reportActionsRect = $('refreshAllReports').getBoundingClientRect();
    check('Sheet names sit below left-hand sheet actions', sheetTabsRect.top >=
      managementRect.bottom && Math.abs(sheetTabsRect.left - managementRect.left) < 1);
    check('Report actions share the top row with sheet management', Math.abs(
      reportActionsRect.top - managementRect.top) < 1);
    check('Legacy resolution metadata removed', !('resolution' in activeSheet()) && !(
      'orientation' in activeSheet()));
    check('Analysis controls removed from reports', !widgetElement(one.id).querySelector(
      '[data-analysis-controls]'));
    check('Reporting parameter selection removed', !document.querySelector(
      '[data-field-section="parameters"]'));
    activeSheet().parameterValues = {
      scale: 3
    };
    await refreshWidget(one);
    log('STATUS:' + one.lastStatus);
    check('Report refresh works', !one.needsRefresh);
    log('VALUES:' + widgetElement(one.id).querySelector('.widget-content').textContent);
    const cardValues = [...widgetElement(one.id).querySelectorAll('.metric-card strong')]
      .map(e => Number(e.textContent.replace(/[^0-9.-]/g, '')));
    check('Worker parameter uses sheet override', cardValues[1] === cardValues[0] * 3);
    check('Derived measure uses query parameter', reportMetricValue(metric('derived'),
        reportDisplaySnapshots.get(one.id).aggregates.totals.get(0)) === cardValues[0] *
      3);
    activeSheet().parameterValues = {
      scale: 7
    };
    one.needsRefresh = true;
    await redrawDisplayedReport(one);
    const retained = [...widgetElement(one.id).querySelectorAll('.metric-card strong')].map(
      e => Number(e.textContent.replace(/[^0-9.-]/g, '')));
    check('Display redraw retains captured query parameters', retained[1] === retained[0] *
      3);
    activeSheet().parameterValues = {
      scale: 3
    };
    one.needsRefresh = false;
    check('Captured underlying records', (reportDisplaySnapshots.get(one.id).aggregates
      .sampleRecords || []).length > 0);
    showReportRecords(one);
    check('Drill-through opens source samples', document.querySelector(
      '.report-record-dialog').textContent.includes('subscription_records'));
    document.querySelector('.report-record-dialog').close();
    const test = (calculation, expected, extra = {}) => {
      const s = [{
        values: [1, 2, 3],
        metricId: 'm',
        periodKey: 0
      }];
      transformReportSeries(s, {
        tableCalculation: calculation,
        ...extra
      });
      check('Calculation ' + calculation, JSON.stringify(s[0].values) === JSON.stringify(
        expected));
    };
    test('running', [1, 3, 6]);
    check('Running total combines split series', reportTransformTotal({
      values: [1, 3, 6, 2, 6, 12],
      originalValues: [1, 2, 3, 2, 4, 6]
    }, 18, {
      tableCalculation: 'running'
    }) === 18);
    test('moving', [1, 1.5, 2.5], {
      movingWindow: 2
    });
    test('share', [1 / 6, 2 / 6, 3 / 6]);
    test('rank', [3, 2, 1]);
    test('average', [2, 2, 2]);
    test('target', [.1, .2, .3], {
      referenceValue: 10
    });
    const simulated = [{
      values: [10, 20]
    }];
    transformReportSeries(simulated, {
      whatIfPercent: 10
    });
    check('What-if estimate', [11, 22].every((v, i) => Math.abs(v - simulated[0].values[
      i]) < 1e-10));
    const changes = [{
      values: [10, 20],
      metricId: 'm',
      periodKey: 0
    }, {
      values: [5, 10],
      metricId: 'm',
      periodKey: 1
    }];
    transformReportSeries(changes, {
      tableCalculation: 'change_percent'
    });
    check('Period comparison calculation', JSON.stringify(changes[0].values) === '[1,1]');
    const trimmed = trimReportPlot(['a', 'b', 'c', 'd', 'e'], [{
      values: [null, 0, null, 2, null]
    }], ['a', 'b', 'c', 'd', 'e']);
    check('Axis fit retains zero and internal gaps', JSON.stringify(trimmed.labels) ===
      '["b","c","d"]' && trimmed.series[0].values[1] === null);
    check('Full axis range opt-out', trimReportPlot(['a', 'b'], [{
      values: [null, 1]
    }], ['a', 'b'], {
      xAxisMode: 'full'
    }).labels.length === 2);
    const svg = renderReportSvg(['a', 'b', 'c'], [{
      values: [null, 2, null],
      label: 'Count',
      metricId: metric('subscriptions')
    }], 'line', metric('subscriptions'));
    check('Graph fits values and keeps Y axis', svg.includes('stroke="#777066"') && !svg
      .includes('>a</text>'));
    check('Canvas scrolls without scrollbar chrome', getComputedStyle($(
      'reportCanvasScroll')).overflowX === 'auto' && getComputedStyle($(
      'reportCanvasScroll')).scrollbarWidth === 'none');
    activeSheet().layoutLocked = true;
    applyCanvasView();
    check('Legacy sheet lock is removed in favor of individual locks', !document.body
      .classList.contains('report-layout-locked') && !activeSheet().layoutLocked && $(
        'reportLock').hidden);
    activeSheet().layoutLocked = false;
    const before = one.name;
    one.name = 'Changed';
    persistReporting();
    travelReportHistory('undo');
    check('Undo restores config', activeSheet().widgets[0].name === before);
    travelReportHistory('redo');
    check('Redo restores config', activeSheet().widgets[0].name === 'Changed');
    check('Custom comparison dates', getComparisonRange({
      start: new Date(2026, 1, 1),
      end: new Date(2026, 1, 28),
      days: 28
    }, {
      compare: 'custom',
      baselineStart: '2025-02-01',
      baselineEnd: '2025-02-28'
    }).days === 28);

    const w = activeSheet().widgets[0];
    check('Parameter merge retains blocks', mergeDictionarySources(text, text).includes(
      'parameter: scale'));
    const validParams = JSON.stringify(reportParameters);
    try {
      resolveLookmlDefinitions(
        'parameter: broken {\n type: number\n default: 3\n}\nmeasure: bad {\n type: invalid\n sql: 1 ;;\n}'
      )
    } catch {}
    check('Invalid dictionary edit preserves parameters', JSON.stringify(
      reportParameters) === validParams);
    const subs = [],
      users = [];
    for (let batch = 0; batch < Math.ceil(appState.count / appState.batchSize); batch++) {
      const truth = await generateStudioBatch(appState, batch, 'report');
      subs.push(...truth.data.subscription_records);
      users.push(...truth.data.user_records);
    }
    const inDates = (row, start, end) => {
      const date = localDateKey(reportDate(row.subscription_start_ts));
      return date >= start && date <= end;
    };
    const expectedCurrent = subs.filter(row => inDates(row, '2026-01-01', '2026-11-23'))
      .length,
      expectedPrior = subs.filter(row => inDates(row, '2025-01-01', '2025-11-23')).length;
    w.config = {
      chartType: 'spreadsheet',
      xFields: [],
      yFields: [{
        kind: 'metric',
        id: metric('subscriptions')
      }],
      compare: '1',
      dateFilterUiVersion: 2,
      dateFilters: [{
        dimension: dim('start_date'),
        range: {
          period: 'custom',
          start: '2026-01-01',
          end: '2026-11-23'
        },
        enabled: true,
        role: 'cohort'
      }]
    };
    w.config.dateFiltersDraft = JSON.parse(JSON.stringify(w.config.dateFilters));
    renderSheet();
    await refreshWidget(w);
    log('COMPARE_STATUS:' + w.lastStatus);
    check('Comparison refresh without date axis', !w.needsRefresh);
    const snapshot = reportDisplaySnapshots.get(w.id);
    const currentCount = reportMetricValue(metric('subscriptions'), snapshot.aggregates
        .totals.get(0)),
      priorCount = reportMetricValue(metric('subscriptions'), snapshot.aggregates.totals
        .get(1));
    log('COMPARE:' + JSON.stringify({
      currentCount,
      priorCount,
      expectedCurrent,
      expectedPrior
    }));
    check('Current period matches source rows', currentCount === expectedCurrent);
    check('Prior year matches source rows', priorCount === expectedPrior);
    w.config.compare = 'custom';
    w.config.baselineStart = '2025-01-01';
    w.config.baselineEnd = '2025-01-31';
    renderSheet();
    await refreshWidget(w);
    const customSnapshot = reportDisplaySnapshots.get(w.id);
    check('Custom baseline respects its own end date', reportMetricValue(metric(
      'subscriptions'), customSnapshot.aggregates.totals.get(1)) === subs.filter(row =>
      inDates(row, '2025-01-01', '2025-01-31')).length);
    const beforeBatches = studioPerformance.workerBatches;
    w.config.tableCalculation = 'share';
    await redrawDisplayedReport(w, {
      tableCalculation: 'share'
    });
    check('Share formats as percent', widgetElement(w.id).querySelector('.widget-content')
      .textContent.includes('%'));
    check('Display calculation does not regenerate source', studioPerformance
      .workerBatches === beforeBatches);
    w.config.tableCalculation = 'none';
    w.config.compare = 'none';
    w.config.parameterValues = {
      scale: 4
    };
    w.config.yFields = [{
      kind: 'metric',
      id: metric('subscriptions')
    }, {
      kind: 'metric',
      id: metric('scaled')
    }];
    w.config.chartType = 'metric_card';
    renderSheet();
    await refreshWidget(w);
    const overrideValues = [...widgetElement(w.id).querySelectorAll('.metric-card strong')]
      .map(e => Number(e.textContent.replace(/[^0-9.-]/g, '')));
    check('Module parameter overrides sheet', overrideValues[1] === overrideValues[0] * 4);
    reportAggregationWorkerDisabled = true;
    reportAggregateCache.clear();
    renderSheet();
    await refreshWidget(w);
    const fallbackValues = [...widgetElement(w.id).querySelectorAll('.metric-card strong')]
      .map(e => Number(e.textContent.replace(/[^0-9.-]/g, '')));
    check('Page fallback agrees with worker', JSON.stringify(overrideValues) === JSON
      .stringify(fallbackValues));
    w.config.yFields = [{
      kind: 'metric',
      id: metric('reactivations')
    }];
    renderSheet();
    await refreshWidget(w);
    const caseValue = Number(widgetElement(w.id).querySelector('.metric-card strong')
      .textContent.replace(/[^0-9.-]/g, ''));
    check('CASE aggregation matches source rows', caseValue === subs.filter(row => row
        .subscription_type === 'reactivation' && inDates(row, '2026-01-01', '2026-11-23'))
      .length);
    w.config = {
      chartType: 'bar',
      xFields: [{
        kind: 'dimension',
        id: dim('state')
      }],
      yFields: [{
        kind: 'metric',
        id: metric('subscriptions')
      }],
      dateFilters: [],
      dateFiltersDraft: [],
      dateFilterUiVersion: 2,
      compare: 'none',
      topN: 3,
      crossFilter: true
    };
    renderSheet();
    await refreshWidget(w);
    check('Top N limits plotted groups', widgetElement(w.id).querySelectorAll(
      'svg rect[data-report-index]').length === 3);
    const second = {
      id: 'cross_target',
      name: 'Cross target',
      gridVersion: REPORT_GRID.version,
      gridColumn: 9,
      gridRow: 1,
      colSpan: 8,
      rowSpan: 25,
      config: {
        chartType: 'metric_card',
        xFields: [],
        yFields: [{
          kind: 'metric',
          id: metric('subscriptions')
        }],
        compare: 'none',
        dateFilterUiVersion: 2,
        dateFilters: [],
        dateFiltersDraft: []
      }
    };
    activeSheet().widgets.push(second);
    renderSheet();
    await refreshWidget(second);
    const point = widgetElement(w.id).querySelector('[data-report-index]'),
      selectedValue = point.dataset.reportValue;
    point.dispatchEvent(new MouseEvent('click', {
      bubbles: true
    }));
    check('Chart click creates cross-filter', activeSheet().crossFilter?.dimension === dim(
      'state'));
    for (let i = 0; i < 500 && second.needsRefresh; i++) await sleep(10);
    const userStates = new Map(users.map(user => [String(user.user_id), user.state]));
    const expectedStateCount = subs.filter(row => userStates.get(String(row.user_id)) ===
      selectedValue).length;
    check('Cross-filter refreshes other module accurately', Number(widgetElement(second.id)
        .querySelector('.metric-card strong').textContent.replace(/[^0-9.-]/g, '')) ===
      expectedStateCount);
    $('resetReportCrossFilter').click();
    check('Cross-filter reset removes filter', !activeSheet().crossFilter);
    for (let i = 0; i < 500 && second.needsRefresh; i++) await sleep(10);
    check('Reset restores complete target count', Number(widgetElement(second.id)
        .querySelector('.metric-card strong').textContent.replace(/[^0-9.-]/g, '')) ===
      subs.length);
    second.gridRow = 31;
    selectedModules.add(w.id);
    selectedModules.add(second.id);
    alignSelectedModules('left');
    check('Alignment positions selected modules', second.gridColumn === w.gridColumn &&
      second.gridRow === 31);
    const beforeAlignment = second.gridRow;
    alignSelectedModules('top');
    check('Alignment rejects overlapping result', second.gridRow === beforeAlignment);
    selectedModules.clear();
    activeSheet().widgets = activeSheet().widgets.filter(widget => widget.id !== second.id);
    renderSheet();
    applyCanvasView();
    const gridRect = $('reportCharts').getBoundingClientRect(),
      zoom = Number($('reportCanvasInner').style.zoom) || 1,
      candidate = reportGridDropCandidate({
        clientX: gridRect.left + 2,
        clientY: gridRect.top + 20 * zoom * 10 + 1
      }, w);
    check('Free canvas retains correct grid coordinates', candidate.gridRow === 11);
    check('No page-level horizontal overflow', document.documentElement.scrollWidth <=
      innerWidth);
    $('definitionEditor').value = text;
    const instance = buildStudioInstance();
    check('Instance retains parameters without resolution', instance.workspace
      .definitionText.includes('parameter: scale') && instance.workspace.reportSheets
      .every(sheet => !sheet.resolution && !sheet.orientation));
    setReportView('dictionary');
    renderDictionary();
    check('Definition cards replace visible master editor', !!$('definitionCards') &&
      getComputedStyle($('definitionEditor').parentElement).display === 'none');
    check('Standalone evaluation and syntax panel removed', getComputedStyle(document
        .querySelector('.dictionary-evaluator')).display === 'none' && !document
      .querySelector('.syntax-assist-card'));
    check('New card buttons use Studio styling', [...document.querySelectorAll(
      '.definition-create-actions button,.definition-card-actions button')].every(
      button => button.classList.contains('secondary')));
    check('Cards grouped by type', JSON.stringify([...document.querySelectorAll(
        '[data-definition-type-group]')].map(el => el.dataset.definitionTypeGroup)) ===
      '["dimension","date","measure","parameter"]');
    check('Formula cards start collapsed', [...document.querySelectorAll(
      '[data-definition-card]')].every(el => !el.open));
    check('Definition label folders start collapsed', [...document.querySelectorAll(
      '.definition-label-stack')].every(el => !el.open));
    check('Function reference starts hidden', $('functionDictionary').hidden && $(
      'toggleFunctionDictionary').textContent === 'Show Functions');
    check('Show Functions precedes Dimension button', $('toggleFunctionDictionary')
      .nextElementSibling.dataset.createDefinition === 'dimension');
    const beforeFunctions = collectDefinitionSource(),
      firstDefinition = document.querySelector('[data-definition-card]');
    firstDefinition.open = true;
    const functionsPosition = scrollY;
    $('toggleFunctionDictionary').click();
    check('Function view hides definition components', !$('functionDictionary').hidden && $(
      'definitionCards').hidden && [...document.querySelectorAll(
      '[data-create-definition]')].every(b => b.hidden));
    check('Function examples are categorized and stage-labelled', $(
      'functionDictionaryResults').textContent.includes('Row') && $(
      'functionDictionaryResults').querySelector('[data-copy-function]'));
    $('functionDictionarySearch').value = 'SAFE_DIVIDE';
    $('functionDictionarySearch').dispatchEvent(new Event('input', {
      bubbles: true
    }));
    check('Function search finds null-safe division', $('functionDictionaryResults')
      .textContent.includes('SAFE_DIVIDE') && $('functionDictionaryResults').textContent
      .includes('NULL'));
    $('functionDictionarySearch').value = '';
    $('functionDictionaryCategory').value = 'Dates';
    $('functionDictionaryCategory').dispatchEvent(new Event('change', {
      bubbles: true
    }));
    check('Category filtering excludes text functions', !$('functionDictionaryResults')
      .textContent.includes('CONCAT(') && $('functionDictionaryResults').textContent
      .includes('DATEDIFF'));
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    let copiedFunction = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async value => {
          copiedFunction = value;
        }
      }
    });
    $('functionDictionaryResults').querySelector('[data-copy-function]').click();
    await sleep(0);
    check('Copy Example copies the selected syntax', copiedFunction.length > 0 && $(
      'functionDictionary').querySelector('.function-copy-status').textContent.includes(
      'copied'));
    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard',
      clipboardDescriptor);
    else delete navigator.clipboard;
    $('toggleFunctionDictionary').click();
    check('Definitions restored with drafts after outside controls close the editor', !$(
        'definitionCards').hidden &&
      collectDefinitionSource() === beforeFunctions && !firstDefinition.open);
    check('Definitions scroll position restored', Math.abs(scrollY - functionsPosition) <
      2);
    firstDefinition.open = false;
    const generatorWidth = (() => {
      setReportView('generator');
      return document.querySelector('main.shell').getBoundingClientRect().width;
    })();
    setReportView('dictionary');
    check('Dictionary page frame matches Generator', Math.abs(document.querySelector(
      'main.shell').getBoundingClientRect().width - generatorWidth) < 1);
    const stateSegment = dictionaryCardSegments.find(segment => segment.name === 'state'),
      stateInput = document.querySelector(
        `[data-definition-card-source="${stateSegment.key}"]`),
      originalState = stateInput.value;
    stateInput.value = originalState.replace('Geography', 'Location');
    stateInput.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    check('Card edits synchronize canonical source', collectDefinitionSource().includes(
      'Location'));
    stateInput.closest('[data-definition-card]').open = true;
    check('Expanded dictionary cards stay inside page', document.documentElement
      .scrollWidth <= innerWidth);
    const sqlPosition = stateInput.value.indexOf('${user_records.state}');
    stateInput.value = stateInput.value.replace('${user_records.state}', 'LOW');
    stateInput.focus();
    stateInput.setSelectionRange(sqlPosition + 3, sqlPosition + 3);
    renderCodeSuggestions(stateInput);
    const completion = stateInput.parentElement.querySelector('[data-code-suggestion]');
    check('Card SQL autocomplete available', !!completion);
    completion.click();
    check('Autocomplete writes into focused card', stateInput.value.includes('LOWER('));
    stateInput.value = originalState;
    stateInput.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    const paramBefore = JSON.stringify(reportParameters),
      measureSegment = dictionaryCardSegments.find(segment => segment.name ===
        'subscriptions');
    evaluateDefinitionCard(measureSegment.key);
    const measureResult = document.querySelector(
      `[data-definition-card="${measureSegment.key}"] .definition-card-result`);
    check('Measure evaluates inside its card', !measureResult.hidden && measureResult
      .querySelector('.evaluation-result-table') && measureResult.textContent.includes(
        'Sample sum'));
    const closeEvaluation = measureResult.closest('[data-definition-card]').querySelector(
      '[data-definition-close-evaluation]');
    check('Close Evaluation button is available', !closeEvaluation.hidden);
    const beforeClose = collectDefinitionSource();
    closeEvaluation.click();
    check('Close Evaluation hides results without editing source', measureResult.hidden &&
      collectDefinitionSource() === beforeClose);
    evaluateDefinitionCard(stateSegment.key);
    const stateResult = stateInput.closest('[data-definition-card]').querySelector(
      '.definition-card-result');
    check('Dimension card evaluation displays distinct values', stateResult.textContent
      .includes('Distinct dimension value'));
    const dimensionRows = [...stateResult.querySelectorAll('tbody tr td')].map(td => td
      .textContent);
    check('Dimension preview values are distinct', new Set(dimensionRows).size ===
      dimensionRows.length);
    check('Dimension evaluation uses all available preview records', stateResult.textContent
      .includes('available preview records evaluated') && dimensionRows.length > 1);
    check('Card evaluation preserves committed parameters', JSON.stringify(
      reportParameters) === paramBefore);
    createDefinitionCard(null, stateSegment.key);
    check('Duplicate definition has unique name', collectDefinitionSource().includes(
      'dimension: state_copy'));
    check('Duplicate retains label grouping', dictionaryCardSegments.find(segment => segment
      .name === 'state_copy').label === 'Geography');
    check('Draft with duplicate resolves', resolveLookmlDefinitions(
      collectDefinitionSource()).dimensions.some(dim => dim.lookmlName ===
      'state_copy'));
    const byName = name => dictionaryCardSegments.find(s => s.name === name);
    const inputFor = name => document.querySelector(
      `[data-definition-card-source="${byName(name).key}"]`);
    const countInput = inputFor('subscriptions'),
      goodCount = countInput.value;
    countInput.value = goodCount.replace('sql: 1', 'sql: imaginary_function(1)');
    countInput.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    const stateEdit = inputFor('state');
    stateEdit.value = stateEdit.value.replace('Geography', 'ZZ Geography');
    stateEdit.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    const unrelated = {
      id: 'unaffected_apply',
      name: 'Unrelated',
      gridVersion: REPORT_GRID.version,
      colSpan: 8,
      rowSpan: 18,
      needsRefresh: false,
      config: {
        xFields: [],
        yFields: [{
          kind: 'metric',
          id: metric('subscriptions')
        }],
        chartType: 'metric_card',
        dateFilters: [],
        dateFiltersDraft: [],
        dateFilterUiVersion: 2
      }
    };
    activeSheet().widgets.push(unrelated);
    const dependent = {
      id: 'dependent_parameter',
      name: 'Dependent',
      config: {
        yFields: [{
          kind: 'metric',
          id: metric('derived')
        }]
      }
    };
    activeSheet().widgets.push(dependent);
    check('Parameter dependency tracing includes derived measures',
      definitionAffectedWidgetIds({
        kind: 'parameter',
        name: 'scale'
      }, {
        kind: 'parameter',
        name: 'scale'
      }).has(dependent.id));
    activeSheet().widgets = activeSheet().widgets.filter(w => w.id !== dependent.id);
    check('Single-card Apply ignores unfinished sibling drafts', applyIndividualDefinition(
      byName('state').key));
    check('Applied label is published and card re-sorted', customAttributes.find(d => d
        .lookmlName === 'state').name === 'ZZ Geography' && inputFor('state').closest(
        '.definition-label-stack').querySelector('summary').textContent ===
      'ZZ Geography');
    check('Applying a definition leaves unrelated report fresh', !unrelated.needsRefresh);
    activeSheet().widgets = activeSheet().widgets.filter(w => w.id !== unrelated.id);
    persistReporting();
    check('Unapplied duplicate is not published', !customAttributes.some(d => d
      .lookmlName === 'state_copy'));
    const appliedBefore = serializeLookmlDefinitions();
    check('Invalid Apply rejected inline', !applyIndividualDefinition(byName(
        'subscriptions').key) && inputFor('subscriptions').closest(
        '[data-definition-card]').querySelector('.definition-card-result').textContent
      .includes('Apply failed'));
    check('Failed Apply retains valid definitions', serializeLookmlDefinitions() ===
      appliedBefore);
    const draftExport = buildStudioInstance();
    check('Studio exports draft and applied source separately', draftExport.workspace
      .definitionText.includes('imaginary_function') && !draftExport.workspace
      .appliedDefinitionText.includes('imaginary_function'));
    loadReporting();
    renderDictionary();
    check('Reload keeps invalid draft without publishing it', $('definitionEditor').value
      .includes('imaginary_function') && !serializeLookmlDefinitions().includes(
        'imaginary_function'));
    inputFor('subscriptions').value = goodCount;
    inputFor('subscriptions').dispatchEvent(new Event('input', {
      bubbles: true
    }));
    const copyInput = inputFor('state_copy');
    copyInput.value =
      `date: state_copy {\n label: "Dates"\n type: date\n sql: DATE(\${subscription_records.subscription_start_ts}) ;;\n}`;
    copyInput.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    check('Apply accepts a definition type change', applyIndividualDefinition(byName(
      'state_copy').key));
    check('Applied type moves card to Dates', inputFor('state_copy').closest(
      '[data-definition-type-group]').dataset.definitionTypeGroup === 'date');
    createDefinitionCard('parameter');
    const newParameter = dictionaryCardSegments.find(s => s.name?.startsWith(
      'new_parameter'));
    const pInput = document.querySelector(
      `[data-definition-card-source="${newParameter.key}"]`);
    pInput.value =
      `parameter: ${newParameter.name} {\n label: "Controls"\n type: number\n default: 5\n allowed_values: [5,10]\n}`;
    pInput.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    check('Parameter card applies', applyIndividualDefinition(newParameter.key));
    check('Dictionary parameters remain without sidebar selection', reportParameters.some(
      p => p.name === newParameter.name) && !document.querySelector(
      '[data-field-section="parameters"]'));
    activeSheet().parameterValues[newParameter.name] = 10;
    persistReporting();
    const boundsInput = inputFor(newParameter.name),
      validBounds = boundsInput.value;
    boundsInput.value = validBounds.replace('[5,10]', '[5]');
    boundsInput.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    const parametersBeforeBounds = JSON.stringify(reportParameters);
    check('Conflicting parameter bounds reject Apply atomically', !
      applyIndividualDefinition(byName(newParameter.name).key) && JSON.stringify(
        reportParameters) === parametersBeforeBounds);
    const validBeforeSaveAll = serializeLookmlDefinitions();
    await saveLookmlDefinitions();
    check('Save-all validation also preserves applied definitions',
      serializeLookmlDefinitions() === validBeforeSaveAll && $('definitionStatus')
      .classList.contains('error'));
    boundsInput.value = validBounds;
    boundsInput.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    setReportView('reporting');
    selectReportModule(null);
    const module = activeSheet().widgets[0];
    check('Setup hidden until module selected', [...widgetElement(module.id)
      .querySelectorAll(':scope > details')
    ].every(el => getComputedStyle(el).display === 'none'));
    check('Floating action bar starts hidden', $('selectedModuleToolbar').hidden);
    widgetElement(module.id).click();
    check('Selecting module reveals toolbar', !$('selectedModuleToolbar').hidden &&
      selectedReportModuleId === module.id);
    check('Sidebar setup shown for selected module', !$('moduleSidebarSetup').hidden && $(
        'moduleSidebarSetup').querySelectorAll('.module-sidebar-context > details')
      .length === 4);
    check('Sidebar sections start collapsed', [...$('moduleSidebarSetup').querySelectorAll(
      '.module-sidebar-context > details')].every(d => !d.open));
    check('Setup removed from report tile', !widgetElement(module.id).querySelector(
      ':scope > details'));
    document.querySelector('.sidebar-dictionary-card h2').click();
    check('Dictionary interaction preserves selected module', selectedReportModuleId ===
      module.id && !$('moduleSidebarSetup').hidden);
    check('Sidebar excludes Analysis and Parameters', !$('moduleSidebarSetup').textContent
      .includes('Analysis & Parameters'));
    if (innerWidth > 900) {
      const dictionaryRect = document.querySelector('.sidebar-dictionary-card')
        .getBoundingClientRect(),
        setupRect = $('moduleSidebarSetup').getBoundingClientRect();
      check('Setup appears beside Dictionary on the right', setupRect.left >= dictionaryRect
        .right + 11 && Math.abs(setupRect.top - dictionaryRect.top) < 1);
      positionSelectedModuleToolbar();
      const floatRect = $('selectedModuleToolbar').getBoundingClientRect(),
        canvasRect = $('reportCanvasScroll').getBoundingClientRect();
      check('Floating actions start at the canvas and clear both sidebars', floatRect
        .left >= setupRect.right + 11 && Math.abs(floatRect.left - canvasRect.left - $(
          'reportCanvasScroll').clientLeft) < 1);
      window.scrollTo(Math.min(120, document.documentElement.scrollWidth - document
        .documentElement.clientWidth), scrollY);
      await sleep(50);
      updateReportSidebarPin();
      positionSelectedModuleToolbar();
      const pannedToolbar = $('selectedModuleToolbar').getBoundingClientRect(),
        pannedSetup = $('moduleSidebarSetup').getBoundingClientRect();
      check('Floating actions stay clear of sidebars while horizontally panning',
        pannedToolbar.left >= Math.max(8, pannedSetup.right + 12));
      const pannedCanvas = $('reportCanvasScroll').getBoundingClientRect();
      check('Floating bar is fully bounded by the visible canvas', pannedToolbar.left >=
        pannedCanvas.left && pannedToolbar.right <= pannedCanvas.right && pannedToolbar
        .right <= document.documentElement.clientWidth + 1);
      const canvasWidthBefore = $('reportCanvasScroll').style.width;
      $('reportCanvasScroll').style.width = '700px';
      await sleep(100);
      const resizedFloat = $('selectedModuleToolbar').getBoundingClientRect(),
        resizedCanvas = $('reportCanvasScroll').getBoundingClientRect();
      check('Canvas size changes automatically realign floating actions', resizedFloat
        .left >= resizedCanvas.left && resizedFloat.right <= resizedCanvas.right);
      $('reportCanvasScroll').style.width = canvasWidthBefore;
      await sleep(60);

      window.scrollTo(0, scrollY);
      await sleep(20);

    }
    positionSelectedModuleToolbar();
    const reservedToolbar = $('selectedModuleToolbar').getBoundingClientRect(),
      reservedCanvas = $('reportCanvasScroll').getBoundingClientRect();
    check('Selected report toolbar reserves its own row above modules', !$(
        'selectedModuleToolbarSpace').hidden && $('selectedModuleToolbarSpace')
      .getBoundingClientRect().height >= reservedToolbar.height + 11 && reservedCanvas
      .top >= reservedToolbar.bottom + 5);
    check('Sidebar setup matches Dictionary card width', Math.abs($('moduleSidebarSetup')
      .getBoundingClientRect().width - document.querySelector(
        '.sidebar-dictionary-card').getBoundingClientRect().width) < 1);
    const originalSidebarAxes = JSON.parse(JSON.stringify({
      x: module.config.xFields,
      y: module.config.yFields
    }));
    const sidebarAxis = $('moduleSidebarSetup').querySelector('[data-drop-axis="x"]');
    sidebarAxis.closest('details').open = true;
    const fieldDrop = new Event('drop', {
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(fieldDrop, 'dataTransfer', {
      value: {
        getData: type => type === 'application/json' ? JSON.stringify({
          kind: 'dimension',
          id: dim('state_copy')
        }) : ''
      }
    });
    sidebarAxis.dispatchEvent(fieldDrop);
    check('Dictionary fields drop into sidebar axes', module.config.xFields.some(f => f
      .id === dim('state_copy')));
    const firstPill = $('moduleSidebarSetup').querySelector(
        '[data-drop-axis="x"] [data-axis-field]'),
      reorderDrop = new Event('drop', {
        bubbles: true,
        cancelable: true
      });
    Object.defineProperty(reorderDrop, 'dataTransfer', {
      value: {
        getData: type => type === 'application/x-report-axis-field' ? JSON.stringify({
          action: 'axis-reorder',
          widgetId: module.id,
          axis: 'x',
          index: module.config.xFields.length - 1
        }) : ''
      }
    });
    Object.defineProperty(reorderDrop, 'clientX', {
      value: firstPill.getBoundingClientRect().left
    });
    firstPill.dispatchEvent(reorderDrop);
    check('Sidebar axis pills reorder through drag and drop', module.config.xFields[0]
      .id === dim('state_copy'));
    module.config.xFields = originalSidebarAxes.x;
    module.config.yFields = originalSidebarAxes.y;
    renderSheet();
    check('Sidebar setup uses Dictionary disclosure font size', getComputedStyle($(
        'moduleSidebarSetup').querySelector(
        '.module-sidebar-context > details > summary')).fontSize === getComputedStyle(
        document.querySelector('#reportFieldPalette .dictionary-folder > summary'))
      .fontSize);
    check('Second floating setup toolbar removed', !$('moduleEditorDock'));
    check('Hide Setup and Hide Buttons removed', !$('selectedModuleToolbar').textContent
      .includes('Hide Setup') && !document.querySelector(
        '[data-widget-action="toggle-buttons"]'));
    check('Header action buttons hidden', getComputedStyle(widgetElement(module.id)
      .querySelector('.widget-actions')).display === 'none');
    check('Toolbar CSV disabled for graph', $('selectedModuleToolbar').querySelector(
      '[data-selected-module-action="export-csv"]').disabled);
    const actionPosition = $('selectedModuleToolbar').getBoundingClientRect();
    $('reportCanvasScroll').scrollTo(100, 150);
    positionSelectedModuleToolbar();
    const afterScroll = $('selectedModuleToolbar').getBoundingClientRect();
    check('Toolbar stays fixed while canvas scrolls', getComputedStyle($(
      'selectedModuleToolbar')).position === 'fixed' && Math.abs(actionPosition.left -
      afterScroll.left) < 1 && Math.abs(actionPosition.top - afterScroll.top) < 1);
    module.config.chartType = 'spreadsheet';
    renderSheet();
    check('Toolbar CSV enabled for spreadsheet', !$('selectedModuleToolbar').querySelector(
      '[data-selected-module-action="export-csv"]').disabled);
    const originalX = JSON.stringify(module.config.xFields),
      originalY = JSON.stringify(module.config.yFields);
    $('selectedModuleToolbar').querySelector('[data-selected-module-action="flip"]')
      .click();
    check('Floating Flip Axis targets selected module', JSON.stringify(module.config
      .xFields) === originalY && JSON.stringify(module.config.yFields) === originalX);
    const moduleCount = activeSheet().widgets.length;
    $('selectedModuleToolbar').querySelector('[data-selected-module-action="duplicate"]')
      .click();
    check('Floating Duplicate targets selected module', activeSheet().widgets.length ===
      moduleCount + 1);
    const copied = activeSheet().widgets.find(widget => widget.id !== module.id);
    widgetElement(copied.id).click();
    check('Clicking another module switches action target', selectedReportModuleId ===
      copied.id && $('selectedModuleToolbar').textContent.includes(copied.name));
    const chartSetting = $('moduleSidebarSetup').querySelector(
      '[data-module-setting="chartType"]');
    chartSetting.value = 'bar';
    chartSetting.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await sleep(0);
    check('Chart settings synchronize floating CSV availability', $('selectedModuleToolbar')
      .querySelector('[data-selected-module-action="export-csv"]').disabled);
    widgetElement(module.id).click();
    const axisRemove = $('moduleSidebarSetup').querySelector(
      '[data-field-kind="dimension"] [data-remove-axis]');
    axisRemove.click();
    check('Editing axes keeps module selected', selectedReportModuleId === module.id && !$(
      'selectedModuleToolbar').hidden);
    $('selectedModuleToolbar').querySelector('[data-selected-module-action="refresh"]')
      .click();
    await reportRefreshFlights.get(module.id);
    check('Floating Refresh recalculates selected report', !module.needsRefresh);
    $('selectedModuleToolbar').querySelector('[data-selected-module-action="recalculate"]')
      .click();
    await reportRefreshFlights.get(module.id);
    check('Floating Recalculate bypasses aggregate cache', module.lastCalculationInspection
      .cached === false);
    handleModuleFilterDrop({
      target: $('moduleSidebarSetup').querySelector('[data-module-filterdrop]'),
      dataTransfer: {
        getData: () => JSON.stringify({
          kind: 'dimension',
          id: dim('state')
        })
      },
      preventDefault() {}
    });
    const caFilter = $('moduleSidebarSetup').querySelector('[data-filter-value="CA"]');
    caFilter.click();
    $('moduleSidebarSetup').querySelector('[data-module-filter-action="apply"]').click();
    check('Sidebar dimension filter applies to selected module', module.config.filters.some(
      f => f.dimension === dim('state') && f.includeValues.includes('CA')));
    handleModuleDateFilterDrop({
      target: $('moduleSidebarSetup').querySelector('[data-module-datefilterdrop]'),
      dataTransfer: {
        getData: () => JSON.stringify({
          kind: 'dimension',
          id: dim('start_date')
        })
      },
      preventDefault() {}
    });
    $('moduleSidebarSetup').querySelector('[data-widget-action="apply-independent-dates"]')
      .click();
    check('Sidebar date filter applies to selected module', module.config.dateFilters.some(
      f => f.dimension === dim('start_date') && f.enabled));
    await refreshWidget(module);
    updateSelectedModuleToolbar();
    check('Sidebar inspector shows refreshed calculation', !!$('moduleSidebarSetup')
      .querySelector('[data-calculation-inspector] .inspection-grid'));
    $('moduleSidebarSetup').querySelector('[data-module-collapse="axes"]').open = true;
    widgetElement(copied.id).click();
    check('Switching modules collapses all sidebar sections', [...$('moduleSidebarSetup')
      .querySelectorAll('.module-sidebar-context > details')
    ].every(d => !d.open));
    widgetElement(module.id).click();
    check('Reporting frame reserves space for all twelve fixed-width columns', document
      .querySelector('main.shell').getBoundingClientRect().width >= generatorWidth);
    if (document.documentElement.clientWidth >= 1400) {
      const lastColumn = document.querySelector('.canvas-column-ruler span:last-child')
        .getBoundingClientRect(),
        canvasFrame = $('reportCanvasScroll').getBoundingClientRect();
      check('Twelfth column is fully visible without horizontal scrolling', lastColumn
        .right <= canvasFrame.right - 1 && $('reportCanvasScroll').scrollWidth <= $(
          'reportCanvasScroll').clientWidth + 1);
    }
    const reportPageRect = document.querySelector('main.shell').getBoundingClientRect();
    check('Reporting expands to accommodate both sidebar cards', innerWidth <= 900 ||
      reportPageRect.width >= reportSidebarWidth * 2 + 1082);
    const dateConfig = JSON.parse(JSON.stringify(module.config));
    module.config = {
      ...module.config,
      chartType: 'line',
      xFields: [{
        kind: 'dimension',
        id: dim('start_date')
      }],
      yFields: [{
        kind: 'metric',
        id: metric('subscriptions')
      }],
      filters: [],
      filterDraft: [],
      dateFilters: [],
      dateFiltersDraft: [],
      dateFilterUiVersion: 2,
      showLegend: true
    };
    renderSheet();
    await refreshWidget(module);
    const dateContent = widgetElement(module.id).querySelector('.widget-content');
    check('Duplicate dates below charts removed', !dateContent.querySelector(
      '.report-date-axis'));
    check('Reset Zoom controls removed', !dateContent.querySelector('[data-date-reset]'));
    check('Single-measure date chart has no legend', [...dateContent.querySelectorAll(
      '.chart-legend')].every(l => l.hidden));
    const datePoints = [...dateContent.querySelectorAll('circle[data-report-index]')];
    check('Date points use one consistent color', datePoints.length > 1 && new Set(
      datePoints.map(p => p.getAttribute('data-point-color'))).size === 1);
    await updateDateDrill(module, 'month', {
      dimension: dim('start_date'),
      start: '2026-01-01',
      end: '2026-11-23'
    });
    const focusedRange = reportDisplaySnapshots.get(module.id).current.days;
    check('Date chart keeps dates on its chart axis', [...widgetElement(module.id)
      .querySelectorAll('svg text')
    ].some(node => /2026/.test(node.textContent)));
    await updateDateDrill(module, 'day', null);
    check('Date granularity can return to daily full filtered range', module.config
      .dateDrillLevel === 'day' && module.config.dateDrillFocus === null &&
      reportDisplaySnapshots.get(module.id).current.days > focusedRange);
    const dateColumns = module.colSpan;
    module.colSpan = 4;
    renderSheet();
    await sleep(30);
    check('Resizing never restores the duplicate date strip', !!widgetElement(module.id)
      .querySelector('svg') && !widgetElement(module.id).querySelector(
        '.report-date-axis,[data-date-reset]'));
    module.colSpan = dateColumns;
    renderSheet();
    module.config.yFields.push({
      kind: 'metric',
      id: metric('reactivations')
    });
    renderSheet();
    await refreshWidget(module);
    const measureLegend = [...widgetElement(module.id).querySelectorAll('.chart-legend')]
      .find(l => !l.hidden);
    check('Multiple date-chart measures have named legend', !!measureLegend && measureLegend
      .textContent.includes('subscriptions') && measureLegend.textContent.includes(
        'reactivations') && !measureLegend.textContent.includes('2026-'));
    const dateTooltipPoints = [...widgetElement(module.id).querySelectorAll(
      'circle[data-report-index]')];
    check('Additional measures receive distinct colors', new Set(dateTooltipPoints.map(p =>
      p.getAttribute('data-point-color'))).size === 2);
    const connected = renderReportSvg(['a', 'b', 'c'], [{
      values: [1, null, 3],
      color: '#302f2b',
      label: 'Test',
      metricId: metric('subscriptions')
    }], 'line', metric('subscriptions'), [], ['a', 'b', 'c'], '', {
      connectDateValues: true
    });
    const connectedPath = new DOMParser().parseFromString(connected, 'image/svg+xml')
      .querySelector('path').getAttribute('d');
    check('Date lines connect across unpopulated dates', (connectedPath.match(/M/g) || [])
      .length === 1 && connectedPath.includes('L'));
    module.config = dateConfig;
    renderSheet();
    activeSheet().canvasRows = 200;
    renderSheet();
    check('Canvas grows beyond initial height', activeSheet().canvasRows >= 200 && $(
      'reportCharts').scrollHeight >= 4000);
    if (innerWidth > 900) {
      const side = document.querySelector('.mockup3-report-sidebar');
      widgetElement(module.id).click();
      $('moduleSidebarSetup').querySelectorAll('details').forEach(d => d.open = true);
      window.scrollTo(0, document.querySelector('#reportingView .report-grid')
        .getBoundingClientRect().top + scrollY + 200);
      updateReportSidebarPin();
      check('Expanded left sidebar follows downward scrolling', side.classList.contains(
          'report-sidebar-pinned') && getComputedStyle(side).position === 'fixed' && side
        .getBoundingClientRect().top >= 0);
      check('Tall sidebar remains scrollable', getComputedStyle(side).overflowY === 'auto');
      window.scrollTo(0, 0);
      updateReportSidebarPin(true);
    }
    const priorSheetId = activeSheetId;
    addSheet();
    check('Switching sheets hides previous module actions', $('selectedModuleToolbar')
      .hidden);
    activeSheetId = priorSheetId;
    renderSheet();
    check('Returning to sheet requires fresh selection', $('selectedModuleToolbar').hidden);
    widgetElement(module.id).click();
    $('reportGridInfo').click();
    check('Click outside hides toolbar and setup', $('selectedModuleToolbar')
      .hidden && [...
        widgetElement(module.id).querySelectorAll(':scope > details')
      ].every(el => getComputedStyle(el).display === 'none'));
    widgetElement(module.id).click();
    setPresentationMode(true);
    check('Presentation hides selected toolbar', $('selectedModuleToolbar').hidden);
    check('Presentation removes reserved action row', $('selectedModuleToolbarSpace')
      .hidden);
    setPresentationMode(false);
    const portable = buildStudioInstance(),
      retainedTables = tables,
      retainedState = appState;
    portable.generator.generated = false;
    portable.workspace.definitionText +=
      '\nmeasure: pending_only {\n type: sum\n fact_table: subscription_records\n sql: 1 ;;\n}';
    await applyStudioInstance(portable);
    check('Instance import preserves applied-versus-draft definitions', $(
      'definitionEditor').value.includes('pending_only') && !customMetrics.some(m => m
      .lookmlName === 'pending_only'));
    tables = retainedTables;
    appState = retainedState;
    const provider = getDictionaryFileHandle,
      storedWorkspaceFlag = hadStoredWorkspace;
    let fileRestoreCalls = 0;
    getDictionaryFileHandle = async () => {
      fileRestoreCalls++;
      return null;
    };
    hadStoredWorkspace = false;
    await restoreProjectDictionaryFile();
    check('Fresh environments still check the portable dictionary', fileRestoreCalls === 1);
    hadStoredWorkspace = true;
    await restoreProjectDictionaryFile();
    check('Applied browser definitions take precedence on restart', fileRestoreCalls === 1);
    getDictionaryFileHandle = provider;
    hadStoredWorkspace = storedWorkspaceFlag;
    setReportView('reporting');
    check('Sheet actions use two compact rows', document.querySelectorAll(
      '.sheet-toolbar > .sheet-actions').length === 2 && getComputedStyle($(
      'addReportSheet')).fontSize === '11px');
    check('Sidebar explanation text removed', !document.querySelector(
      '.report-controls .report-note:not([data-sidebar-module-title])'));
    check('Browser save text hidden', getComputedStyle($('reportSaveState')).display ===
      'none');
    const dragWidget = activeSheet().widgets.find(w => w.kind !== 'placeholder');
    const dragElement = widgetElement(dragWidget.id);
    dragElement.setPointerCapture = () => {};
    dragElement.hasPointerCapture = () => false;
    const dragRect = dragElement.getBoundingClientRect();
    const dragEvent = {
      button: 0,
      pointerId: 77,
      target: dragElement,
      clientX: dragRect.left + 30,
      clientY: dragRect.top + 30,
      preventDefault() {}
    };
    activeSheet().layoutLocked = false;
    startSurfaceDrag(dragEvent);
    moveSurfaceDrag({
      ...dragEvent,
      clientX: dragEvent.clientX + 2
    });
    check('Ordinary clicks do not move modules', surfaceDrag && !surfaceDrag.moved);
    const targetRow = Math.max(...activeSheet().widgets.map(w => w.gridRow + w.rowSpan)) +
      3;
    const hostRect = $('reportCharts').getBoundingClientRect();
    moveSurfaceDrag({
      ...dragEvent,
      clientX: hostRect.left + 30,
      clientY: hostRect.top + (targetRow - 1) * 20 + 30
    });
    check('Surface drag shows snapped placement preview', surfaceDrag.moved && surfaceDrag
      .valid && !!document.querySelector('.canvas-drop-preview'));
    const expectedRow = surfaceDrag.candidate.gridRow;
    finishSurfaceDrag(dragEvent);
    check('Surface drop saves grid position and clears preview', dragWidget.gridRow ===
      expectedRow && !surfaceDrag && !document.querySelector('.canvas-drop-preview'));
    activeSheet().layoutLocked = true;
    startSurfaceDrag(dragEvent);
    check('Layout lock prevents surface dragging', !surfaceDrag);
    activeSheet().layoutLocked = false;
    startSurfaceDrag({
      ...dragEvent,
      target: $('addReportSheet')
    });
    check('Controls remain interactive rather than draggable', !surfaceDrag);
    startSurfaceDrag(dragEvent);
    moveSurfaceDrag({
      ...dragEvent,
      clientX: dragEvent.clientX + 20
    });
    finishSurfaceDrag(dragEvent, true);
    check('Cancelled drag leaves original placement intact', dragWidget.gridRow ===
      expectedRow && !document.body.classList.contains('report-surface-dragging'));
    addPlaceholder();
    const placeholderElement = document.querySelector(
      '#reportCharts > .placeholder-widget');
    check('Transparent placeholder has faint solid outline', getComputedStyle(
      placeholderElement).borderTopStyle === 'solid' && getComputedStyle(
      placeholderElement).borderTopColor.includes('0.22'));
    const styleWidget = activeSheet().widgets.find(w => w.kind !== 'placeholder');
    styleWidget.config.chartType = 'line';
    renderSheet();
    selectReportModule(styleWidget.id);
    const setup = $('moduleSidebarSetup');
    check('Chart Text Color control removed', !setup.querySelector(
      '[data-module-setting="chartTextColor"]'));
    check('Linear and Logarithmic configuration options available', setup.querySelector(
      '[data-module-setting="axisScale"] option[value="log"]'));
    const paletteChoice = setup.querySelector('[data-palette-choice="ocean_pearl"]');
    paletteChoice.closest('details').open = true;
    paletteChoice.click();
    check('Dropdown palette buttons update the selected module', styleWidget.config
      .paletteId === 'ocean_pearl' && setup.querySelector('.palette-choice-current')
      .textContent.includes('Ocean'));
    check('Palette preview removed from separate configuration component', !setup
      .querySelector('.palette-swatches'));
    const dateRow = setup.querySelector('.module-date-range-row');
    const dateGroup = setup.querySelector('.independent-date-filters');
    check('Apply Date Filter follows all date fields', dateGroup.lastElementChild.classList
      .contains('date-window-actions') && getComputedStyle(dateGroup.lastElementChild)
      .gridRowStart === 'auto');
    check('Date Dimension and Measure folders have doubled dropdown height', document
      .querySelector('#reportFieldPalette .dictionary-folder>summary')
      .getBoundingClientRect().height >= 48);
    check('Setup extra height is distributed across its dropdown sections', parseFloat(setup
      .style.getPropertyValue('--setup-panel-min-height')) > 0 && parseFloat(setup.style
      .getPropertyValue('--setup-section-extra')) > 0);

    check('Date name is placed above date-window dropdown', dateRow && getComputedStyle(
        dateRow.querySelector('.date-filter-name')).gridRowStart === '1' &&
      getComputedStyle(dateRow.querySelector('select')).gridRowStart === '2');
    const fittedSvg = renderReportSvg(['a', 'b'], [{
      label: 'Count',
      color: '#773366',
      values: [1000, 1005]
    }], 'line', metric('subscriptions'));
    const svgDoc = new DOMParser().parseFromString(fittedSvg, 'image/svg+xml');
    check('Rendered line axis uses fitted value range', Number(svgDoc.documentElement
      .getAttribute('data-value-min')) > 990);
    const invalidLogSvg = renderReportSvg(['a', 'b'], [{
      label: 'Count',
      color: '#773366',
      values: [0, 1]
    }], 'line', metric('subscriptions'), [], ['a', 'b'], '', {
      axisScale: 'log'
    });
    check('Rendered invalid logarithmic chart explains the problem', invalidLogSvg.includes(
      'requires positive values'));
    const validLogSvg = renderReportSvg(['a', 'b'], [{
      label: 'Count',
      color: '#773366',
      values: [1, 100]
    }], 'line', metric('subscriptions'), [], ['a', 'b'], '', {
      axisScale: 'log'
    });
    check('Rendered logarithmic chart has valid coordinates', validLogSvg.includes(
      'data-value-scale="log"') && !validLogSvg.includes('NaN'));
    styleWidget.config.xFields = [];
    styleWidget.config.yFields = [{
      kind: 'metric',
      id: metric('subscriptions')
    }];
    styleWidget.config.axisScale = 'linear';
    styleWidget.config.filters = [];
    styleWidget.config.filtersDraft = [];
    styleWidget.needsRefresh = true;
    renderSheet();
    await refreshWidget(styleWidget);
    styleWidget.config.axisScale = 'log';
    await redrawDisplayedReport(styleWidget, {
      axisScale: 'log'
    });
    check('Logarithmic selection redraws captured aggregates without source refresh',
      widgetElement(styleWidget.id).querySelector('svg[data-value-scale="log"]'));
    styleWidget.config.paletteId = 'berry_cream';
    await redrawDisplayedReport(styleWidget, {
      paletteId: 'berry_cream'
    });
    check('Changing palette preserves the logarithmic axis', widgetElement(styleWidget.id)
      .querySelector('svg[data-value-scale="log"]'));
    selectReportModule(styleWidget.id);
    const inspector = $('moduleSidebarSetup').querySelector('[data-calculation-inspector]');
    inspector.open = true;
    const inspectedRows = [...inspector.querySelectorAll('.inspection-grid > *')];
    check('Inspector labels and values do not overlap', inspectedRows.length > 0 &&
      inspectedRows.every((node, i) => i === 0 || node.getBoundingClientRect().top >=
        inspectedRows[i - 1].getBoundingClientRect().bottom));
    const cropSeries = [{
      label: 'Count',
      metricId: metric('subscriptions'),
      color: '#773366',
      values: [10, 40, 50]
    }];
    const cropSvg = renderReportSvg(['Jan 1', 'Jan 2', 'Jan 3'], cropSeries, 'line', metric(
      'subscriptions'), [], ['Jan 1', 'Jan 2', 'Jan 3'], 20, {
      valueAxisMinimum: 30,
      autoFitValueAxis: true
    });
    const cropDoc = new DOMParser().parseFromString(cropSvg, 'image/svg+xml'),
      cropRoot = cropDoc.documentElement;
    check('Minimum crops plot geometry without removing date labels', cropRoot.getAttribute(
      'data-value-min') === '30' && cropRoot.querySelector(
      'g[data-value-plot][clip-path]') && [...cropRoot.querySelectorAll('text')].some(
      t => t.textContent === 'Jan 1'));
    check('Below-minimum points are not clamped to fake boundary values', Number(cropRoot
      .querySelector('circle').getAttribute('cy')) > 278);
    const comboCrop = renderReportSvg(['Jan 1', 'Jan 2'], [{
      label: 'Bars',
      metricId: 'bars',
      color: '#773366',
      values: [10, 20]
    }, {
      label: 'Line',
      metricId: 'line',
      color: '#336677',
      values: [40, 50]
    }], 'combo', metric('subscriptions'), [], ['Jan 1', 'Jan 2'], '', {
      valueAxisMinimum: 30
    });
    check('Bar+Line retains visible secondary values when primary values are cropped',
      comboCrop.includes('<svg') && !comboCrop.includes('NaN'));
    const horizontalCrop = renderHorizontalBarSvg(['Jan 1', 'Jan 2', 'Jan 3'], cropSeries,
      metric('subscriptions'), ['Jan 1', 'Jan 2', 'Jan 3'], '', {
        valueAxisMinimum: 30
      });
    check('Flipped bar charts support the same crop and retain dates', horizontalCrop
      .includes('data-value-min="30"') && horizontalCrop.includes('data-value-plot') &&
      horizontalCrop.includes('Jan 1'));
    styleWidget.config.axisScale = 'linear';
    await redrawDisplayedReport(styleWidget, {
      axisScale: 'linear'
    });
    const minimumControl = $('moduleSidebarSetup').querySelector(
      '[data-module-setting="valueAxisMinimum"]');
    const sourceCount = tables.subscription_records.count;
    minimumControl.value = '30';
    minimumControl.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await sleep(100);
    check('Minimum control redraws current aggregates without changing source data',
      styleWidget.config.valueAxisMinimum === 30 && widgetElement(styleWidget.id)
      .querySelector('svg[data-value-min="30"]') && tables.subscription_records.count ===
      sourceCount);
    const fitControl = $('moduleSidebarSetup').querySelector(
      '[data-module-setting="autoFitValueAxis"]');
    fitControl.checked = false;
    fitControl.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await sleep(80);
    check('Explicit minimum wins when auto-fit is switched off', widgetElement(styleWidget
      .id).querySelector('svg[data-value-min="30"]'));
    minimumControl.value = '';
    minimumControl.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await sleep(80);
    check('Clearing the minimum restores the automatic scale', styleWidget.config
      .valueAxisMinimum === '' && widgetElement(styleWidget.id).querySelector(
        'svg[data-value-min="0"]'));
    if (innerWidth > 900) {
      window.scrollTo(0, 0);
      updateReportSidebarPin(true);
      const bouncingSide = document.querySelector('.mockup3-report-sidebar');
      const tallProbe = document.createElement('div');
      tallProbe.style.height = '2200px';
      bouncingSide.append(tallProbe);
      updateReportSidebarPin(true);
      const pinGrid = bouncingSide.closest('.report-grid');
      const requestedScroll = pinGrid.getBoundingClientRect().top + scrollY + 650;
      window.scrollTo(0, requestedScroll);
      await sleep(120);
      check('Tall sidebar pinning does not bounce page upward', Math.abs(scrollY -
        requestedScroll) < 2);
      window.scrollTo(0, requestedScroll + 150);
      await sleep(80);
      check('Continued downward scrolling remains stable with sidebar pinned', Math.abs(
        scrollY - (requestedScroll + 150)) < 2);
      const beforeResetScroll = scrollY;
      updateReportSidebarPin(true);
      await sleep(50);
      check('Sidebar geometry updates preserve page scroll', Math.abs(scrollY -
        beforeResetScroll) < 2);
      positionSelectedModuleToolbar();
      const pinnedFloat = $('selectedModuleToolbar').getBoundingClientRect(),
        pinnedSide = bouncingSide.getBoundingClientRect();
      check('Pinned floating bar stays beyond the combined sidebar width', pinnedFloat
        .left >= pinnedSide.right + 11);
      check('Scrolled canvas does not paint beneath the pinned action bar',
        getComputedStyle($('reportCanvasScroll')).clipPath.startsWith('inset('));

      tallProbe.remove();
      window.scrollTo(0, 0);
      updateReportSidebarPin(true);
    }
    const lineProbe = [{
      label: 'Probe',
      metricId: metric('subscriptions'),
      color: '#335577',
      values: [10, 20, 15]
    }];
    const lineDoc = (options = {}) => new DOMParser().parseFromString(renderReportSvg(['a',
        'b', 'c'
      ], lineProbe, 'line', metric('subscriptions'), [], ['a', 'b', 'c'], '', options),
      'image/svg+xml');
    const defaultLine = lineDoc();
    check('Line defaults have no visible point markers and straight paths', defaultLine
      .querySelector('path[data-line-shape="straight"]') && [...defaultLine
        .querySelectorAll('[data-line-marker]')
      ].every(node => node.getAttribute('data-line-marker') === 'none' && node
        .getAttribute('fill') === 'transparent'));
    check('Hidden markers retain data-point hover targets', defaultLine.querySelectorAll(
      '[data-line-marker="none"][data-chart-tooltip]').length === 3);
    for (const marker of ['dot', 'circle', 'donut', 'square']) {
      const doc = lineDoc({
        lineMarker: marker
      });
      check('Line marker renders ' + marker, doc.querySelectorAll(
        `[data-line-marker="${marker}"]`).length === 3 && !doc.querySelector(
        'parsererror'));
    }
    check('Step lines use horizontal and vertical segments', lineDoc({
      lineShape: 'step'
    }).querySelector('path').getAttribute('d').includes('H'));
    check('Smooth lines use bounded Bezier curves', lineDoc({
      lineShape: 'smooth'
    }).querySelector('path').getAttribute('d').includes('C') && !lineDoc({
      lineShape: 'smooth'
    }).querySelector('parsererror'));
    const horizontalLine = lineDoc({
      flipAxis: true,
      lineMarker: 'square',
      lineShape: 'smooth'
    });
    check('Dates assigned to Y remain on the Y chart axis', horizontalLine.querySelector(
      'svg[data-date-axis="y"]') && horizontalLine.querySelectorAll(
      'text[data-axis-label="category"]').length === 3);
    const comboStyle = renderReportSvg(['a', 'b'], [{
      label: 'Bars',
      metricId: metric('subscriptions'),
      color: '#335577',
      values: [40, 50]
    }, {
      label: 'Line',
      metricId: metric('reactivations'),
      color: '#773355',
      values: [3, 8]
    }], 'combo', metric('subscriptions'), [], ['a', 'b'], '', {
      lineMarker: 'square',
      lineShape: 'step'
    });
    const comboStyleDoc = new DOMParser().parseFromString(comboStyle, 'image/svg+xml');
    check('Bar+Line honors square markers and step-line style', comboStyleDoc
      .querySelectorAll('[data-line-marker="square"]').length === 2 && comboStyleDoc
      .querySelector('path[data-line-shape="step"]'));
    styleWidget.lastHtml +=
      '<div class="report-date-axis">Old date strip<button data-date-reset>Reset Zoom</button></div>';
    renderSheet();
    selectReportModule(styleWidget.id);
    check('Saved legacy date strips and reset controls are removed on load', !widgetElement(
      styleWidget.id).querySelector('.report-date-axis,[data-date-reset]'));
    const markerControl = $('moduleSidebarSetup').querySelector(
      '[data-module-setting="lineMarker"]');
    markerControl.value = 'square';
    markerControl.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await sleep(100);
    check('Square-marker selection redraws the current report', widgetElement(styleWidget
      .id).querySelector('[data-line-marker="square"]'));
    const shapeControl = $('moduleSidebarSetup').querySelector(
      '[data-module-setting="lineShape"]');
    shapeControl.value = 'smooth';
    shapeControl.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await sleep(100);
    check('Curve selection redraws the current report without source changes',
      widgetElement(styleWidget.id).querySelector('path[data-line-shape="smooth"]') &&
      tables.subscription_records.count === sourceCount);
    const retainedMinimum = styleWidget.config.valueAxisMinimum;
    delete styleWidget.config.smartAxisZoomVersion;
    styleWidget.config.autoFitValueAxis = false;
    styleWidget.config.dateDrillFocus = {
      start: "2026-01-01",
      end: "2026-01-31"
    };
    moduleCard(styleWidget, 0);
    check('Smart axis zoom is enabled by default after migration', styleWidget.config
      .autoFitValueAxis === true && styleWidget.config.valueAxisMinimum ===
      retainedMinimum && styleWidget.config.dateDrillFocus === null);
    styleWidget.config.autoFitValueAxis = false;
    moduleCard(styleWidget, 0);
    check('Smart zoom can be turned off and stays off', styleWidget.config
      .autoFitValueAxis === false);
    const tickInput = $('moduleSidebarSetup').querySelector(
      '[data-module-setting="tickInterval"]');
    tickInput.value = '50';
    tickInput.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    }));
    await sleep(100);
    check('Enter applies Tick Interval without a module refresh', styleWidget.config
      .tickInterval === 50 && [...widgetElement(styleWidget.id).querySelectorAll(
        'svg text')].some(t => t.textContent === '50') && !styleWidget.needsRefresh);
    check('Tick Interval redraw leaves source records unchanged', tables
      .subscription_records.count === sourceCount);
    shapeControl.value = 'straight';
    shapeControl.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await sleep(100);
    check('Other display changes retain the entered Tick Interval', [...widgetElement(
      styleWidget.id).querySelectorAll('svg text')].some(t => t.textContent === '50'));
    tickInput.value = '';
    tickInput.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    }));
    await sleep(100);
    check('Blank Tick Interval plus Enter restores automatic ticks', styleWidget.config
      .tickInterval === '');
    const renameDefinitions = resolveLookmlDefinitions(`
      date: subscription_start_date {
        type: date
        sql: date(\${subscription_records.subscription_start_ts}) ;;
      }
      measure: total_subscriptions {
        type: sum
        sql: 1 ;;
        fact_table: subscription_records
      }
      measure: new_subscriptions {
        type: sum
        sql: case when \${subscription_records.subscription_type}='new_subscription' then 1 else 0 end ;;
      }
      measure: percent_new_subscriptions {
        type: number
        sql: {{new_subscriptions}} / {{total_subscriptions}} ;;
        value_format: percent
        percent_scale: points
      }
    `);
    customAttributes = renameDefinitions.dimensions;
    customMetrics = renameDefinitions.measures;
    definitionRevision++;
    const repairedDateId = customAttributes.find(d => d.lookmlName ===
      'subscription_start_date').id;
    const renameReport = {
      id: 'rename_report',
      name: 'Renamed date regression',
      gridVersion: REPORT_GRID.version,
      colSpan: 8,
      rowSpan: 25,
      config: {
        chartType: 'metric_card',
        xFields: [{
          kind: 'metric',
          id: 'metric_percent_new_subscriptions'
        }],
        yFields: [],
        filters: [],
        filterDraft: [],
        dateFilterUiVersion: 2,
        dateFilters: [{
          id: 'date_0',
          dimension: 'attr_subscription_start_dt',
          role: 'cohort',
          enabled: true,
          range: {
            period: 'all_time'
          }
        }],
        dateFiltersDraft: [{
          id: 'date_0',
          dimension: 'attr_subscription_start_dt',
          role: 'cohort',
          enabled: true,
          range: {
            period: 'all_time'
          }
        }]
      }
    };
    reportSheets = [{
      id: 'rename_sheet',
      name: 'Rename regression',
      widgets: [renameReport]
    }];
    activeSheetId = 'rename_sheet';
    renderSheet();
    await refreshWidget(renameReport);
    const expectedNewPercent = 100 * subs.filter(s => s.subscription_type ===
      'new_subscription').length / subs.length;
    check('Renamed daily date repairs applied and draft filter references', renameReport
      .config.dateFilters[0].dimension === repairedDateId && renameReport.config
      .dateFiltersDraft[0].dimension === repairedDateId);
    check('Saved ratio card with legacy date filter matches source rows', renameReport
      .lastCalculationInspection.accepted === subs.length && renameReport.lastHtml
      .includes(expectedNewPercent.toFixed(2) + '%'));
    check('Repaired filter preserves the selected date window', renameReport.config
      .dateFilters[0].range.period === 'all_time');
    renameReport.config.dateFilters[0].range = {
      period: 'custom',
      start: '2026-01-01',
      end: '2026-11-23'
    };
    renameReport.config.dateFiltersDraft = JSON.parse(JSON.stringify(renameReport.config
      .dateFilters));
    await refreshWidget(renameReport);
    check('Repaired date still applies its actual range', renameReport
      .lastCalculationInspection.accepted === expectedCurrent);
    const missingDateConfig = JSON.parse(JSON.stringify(renameReport.config));
    missingDateConfig.dateFilters[0].dimension = 'attr_deleted_date';
    check('Unknown missing dates are reported instead of excluding every record',
      validateReportPlan(missingDateConfig, ['metric_percent_new_subscriptions']).some(
        message => message.includes('attr_deleted_date') && message.includes('missing')));
    const canonicalDate = customAttributes.find(d => d.id === repairedDateId),
      originalDateExpression = canonicalDate.caseExpr;
    canonicalDate.caseExpr =
      "date_trunc('year', [subscription_records.subscription_start_ts])";
    check('Legacy migration never substitutes a grouped year for an individual date',
      resolveReportDateReference('attr_subscription_start_dt') ===
      'attr_subscription_start_dt');
    canonicalDate.caseExpr = originalDateExpression;
    const scheduleDefinitions = resolveLookmlDefinitions(`
      date: subscription_start_date {
        type: date
        sql: date(\${subscription_records.subscription_start_ts}) ;;
      }
      dimension: cohort {
        type: string
        sql: datediff('month', \${subscription_records.subscription_start_ts}, \${transaction_records.transaction_ts}) ;;
      }
      measure: total_renewals {
        type: sum
        sql: case when \${scheduled_subscription_payment_records.payment_status} in ('paid','scheduled') then 1 else 0 end ;;
      }
      measure: table_renewals {
        type: table_sum
        sql: {{total_renewals}} ;;
        table_mode: window
        table_scope: visible
        table_partition: series
      }
      measure: unpaid_schedule_rows {
        type: sum
        fact_table: scheduled_subscription_payment_records
        sql: case when \${transaction_records.transaction_ts} is null then 1 else 0 end ;;
      }
    `);
    customAttributes = scheduleDefinitions.dimensions;
    customMetrics = scheduleDefinitions.measures;
    definitionRevision++;
    const scheduledTruth = [],
      subscriptionTruth = new Map(),
      transactionTruth = new Map(),
      generatedSubscriptionIds = [];
    for (let batch = 0; batch < Math.ceil(appState.count / appState.batchSize); batch++) {
      const generated = await generateStudioBatch(appState, batch, 'generator');
      scheduledTruth.push(...generated.data.scheduled_subscription_payment_records);
      generated.data.subscription_records.forEach(row => {
        subscriptionTruth.set(String(row.subscription_id), row);
        generatedSubscriptionIds.push(row.subscription_id);
      });
      generated.data.transaction_records.forEach(row => transactionTruth.set(String(row
        .transaction_id), row));
    }
    check('Subscription IDs stay unique across multiple generation batches', new Set(
      generatedSubscriptionIds).size === generatedSubscriptionIds.length);
    check('Missing capture timestamps remain SQL NULL dates', SQL_FUNCTIONS.DATEDIFF(
      'month', '2026-01-01', null) === null && SQL_FUNCTIONS.DATE(null) === null);
    const scheduleWindow = getReportRange({
      period: 'all_time'
    });
    const eligibleSchedules = scheduledTruth.filter(row => {
      const sub = subscriptionTruth.get(String(row.subscription_id)),
        date = reportDate(sub.subscription_start_ts);
      return Number.isFinite(date.getTime()) && localDateKey(date) >= localDateKey(
        scheduleWindow.start) && localDateKey(date) <= localDateKey(scheduleWindow
        .end);
    });
    const renewalSchedules = eligibleSchedules.filter(row => ['paid', 'scheduled'].includes(
      row.payment_status));
    const scheduleReport = {
      id: 'scheduled_regression',
      name: 'Scheduled report regression',
      gridVersion: REPORT_GRID.version,
      colSpan: 8,
      rowSpan: 25,
      config: {
        chartType: 'spreadsheet',
        xFields: [],
        yFields: [{
          kind: 'metric',
          id: 'metric_total_renewals'
        }, {
          kind: 'metric',
          id: 'metric_table_renewals'
        }, {
          kind: 'metric',
          id: 'metric_unpaid_schedule_rows'
        }],
        filters: [],
        filterDraft: [],
        dateFilters: [{
          id: 'start',
          dimension: 'attr_subscription_start_date',
          role: 'cohort',
          enabled: true,
          range: {
            period: 'all_time'
          }
        }],
        dateFilterUiVersion: 2
      }
    };
    reportSheets = [{
      id: 'schedule_regression_sheet',
      name: 'Schedule regression',
      widgets: [scheduleReport]
    }];
    activeSheetId = 'schedule_regression_sheet';
    renderSheet();
    await refreshWidget(scheduleReport);
    const scheduleValue = (report, id) => reportMetricValue(id, reportDisplaySnapshots.get(
      report.id).aggregates.totals.get(0));
    check('Scheduled-payment reports retain complete subscription dates', scheduleReport
      .lastCalculationInspection.accepted === eligibleSchedules.length);
    check('Scheduled CASE aggregate equals generated payment-status counts', scheduleValue(
      scheduleReport, 'metric_total_renewals') === renewalSchedules.length);
    check('Table calculations use scheduled aggregates without false row-level errors',
      scheduleValue(scheduleReport, 'metric_table_renewals') === renewalSchedules
      .length && !scheduleReport.lastStatus.includes('Formula issue'));
    scheduleReport.config.xFields = [{
      kind: 'dimension',
      id: 'attr_cohort'
    }];
    renderSheet();
    check('Successful transaction link supports cohort at scheduled-payment grain',
      validateReportPlan(scheduleReport.config, ['metric_total_renewals']).length === 0);
    await refreshWidget(scheduleReport);
    const expectedCohorts = new Map();
    for (const row of renewalSchedules) {
      const tx = transactionTruth.get(String(row.transaction_id)),
        sub = subscriptionTruth.get(String(row.subscription_id));
      const key = tx ? String(SQL_FUNCTIONS.DATEDIFF('month', sub.subscription_start_ts, tx
        .transaction_ts)) : '(Unknown)';
      expectedCohorts.set(key, (expectedCohorts.get(key) || 0) + 1);
    }
    const actualCohorts = new Map([...reportDisplaySnapshots.get(scheduleReport.id)
      .aggregates.buckets.values()
    ].filter(bucket => bucket.period === 0).map(bucket => [String(bucket.x),
      reportMetricValue('metric_total_renewals', bucket)
    ]));
    check('Cohort groups match exact captured-transaction links', [...expectedCohorts]
      .every(([key, count]) => actualCohorts.get(key) === count));
    check('Unpaid schedules remain in the Unknown cohort', expectedCohorts.get(
      '(Unknown)') > 0 && actualCohorts.get('(Unknown)') === expectedCohorts.get(
      '(Unknown)'));
    check('CASE expressions retain SQL NULL semantics for unpaid schedule joins',
      scheduleValue(scheduleReport, 'metric_unpaid_schedule_rows') === eligibleSchedules
      .filter(row => !transactionTruth.has(String(row.transaction_id))).length);
    check('Joining transactions does not multiply scheduled counts', scheduleValue(
      scheduleReport, 'metric_total_renewals') === renewalSchedules.length);
    const workerBefore = reportAggregationWorkerDisabled;
    reportAggregationWorkerDisabled = true;
    reportAggregateCache.clear();
    await refreshWidget(scheduleReport);
    check('Page fallback matches scheduled cohorts and totals', scheduleValue(
      scheduleReport, 'metric_total_renewals') === renewalSchedules.length && [...
      expectedCohorts
    ].every(([key, count]) => [...reportDisplaySnapshots.get(scheduleReport.id)
      .aggregates.buckets.values()
    ].some(bucket => String(bucket.x) === key && reportMetricValue(
      'metric_total_renewals', bucket) === count)));
    reportAggregationWorkerDisabled = workerBefore;
    const secondScheduleReport = {
      ...scheduleReport,
      id: 'scheduled_regression_second',
      config: JSON.parse(JSON.stringify(scheduleReport.config))
    };
    activeSheet().widgets.push(secondScheduleReport);
    renderSheet();
    reportAggregateCache.clear();
    await refreshActiveSheet();
    check('Refresh All retains tables needed only by custom cohort dimensions', [
      scheduleReport, secondScheduleReport
    ].every(report => scheduleValue(report, 'metric_total_renewals') ===
      renewalSchedules.length && !report.lastStatus.includes('Formula issue')));
    const identityDefinitions = resolveLookmlDefinitions(`
      dimension: processor {
        type: string
        sql: \${transaction_records.payment_processor} ;;
      }
      measure: revenue {
        type: sum
        sql: \${transaction_records.gross_amount} ;;
      }
      measure: txn_count {
        type: count
        sql: \${transaction_records.transaction_id} ;;
      }
      measure: average_revenue {
        type: avg
        sql: \${transaction_records.gross_amount} ;;
      }
      measure: unique_users {
        type: count_distinct
        sql: \${transaction_records.user_id} ;;
      }
      measure: revenue_per_tx {
        type: number
        sql: {{revenue}} / {{txn_count}} ;;
      }
      measure: table_revenue {
        type: table_sum
        sql: {{revenue}} ;;
        table_mode: window
        table_scope: visible
        table_partition: all
      }
      measure: table_users {
        type: table_sum
        sql: {{unique_users}} ;;
        table_mode: window
        table_scope: visible
        table_partition: all
      }
    `);
    customAttributes = identityDefinitions.dimensions;
    customMetrics = identityDefinitions.measures;
    definitionRevision++;
    const generationBeforeUnique = generateStudioBatch,
      stateBeforeUnique = appState,
      workerBeforeUnique = reportAggregationWorkerDisabled;
    const identityDate = appState.now;
    const repeatedTransactions = [{
      transaction_id: 42,
      user_id: 42,
      subscription_id: 56,
      transaction_ts: identityDate,
      transaction_type: 'renewal',
      gross_amount: '100.00',
      net_amount: '100.00',
      payment_processor: 'A'
    }, {
      transaction_id: 42,
      user_id: 42,
      subscription_id: 56,
      transaction_ts: identityDate,
      transaction_type: 'renewal',
      gross_amount: '100.00',
      net_amount: '100.00',
      payment_processor: 'B'
    }, {
      transaction_id: 43,
      user_id: 42,
      subscription_id: 56,
      transaction_ts: identityDate,
      transaction_type: 'renewal',
      gross_amount: '100.00',
      net_amount: '100.00',
      payment_processor: 'B'
    }, {
      transaction_id: 43,
      user_id: 42,
      subscription_id: 56,
      transaction_ts: identityDate,
      transaction_type: 'renewal',
      gross_amount: '100.00',
      net_amount: '100.00',
      payment_processor: 'B'
    }];
    const identityData = {
      user_records: [{
        user_id: 42,
        signup_ts: identityDate
      }],
      subscription_records: [{
        user_id: 42,
        subscription_id: 56,
        subscription_start_ts: identityDate,
        subscription_length: 1,
        subscription_type: 'new_subscription'
      }],
      transaction_records: repeatedTransactions,
      subscription_change_records: [],
      failed_transactions: [],
      scheduled_subscription_payment_records: []
    };
    generateStudioBatch = async () => ({
      data: identityData,
      scheduleEvents: []
    });
    appState = {
      ...appState,
      count: 1,
      runId: 'unique-record-regression'
    };
    const uniqueMeasureNames = ['revenue', 'txn_count', 'average_revenue', 'unique_users',
      'revenue_per_tx', 'table_revenue', 'table_users'
    ];
    const uniqueReport = {
      id: 'unique_record_report',
      name: 'Unique records',
      gridVersion: REPORT_GRID.version,
      colSpan: 8,
      rowSpan: 25,
      config: {
        chartType: 'spreadsheet',
        xFields: [{
          kind: 'dimension',
          id: 'attr_processor'
        }],
        yFields: uniqueMeasureNames.map(name => ({
          kind: 'metric',
          id: 'metric_' + name
        })),
        filters: [],
        filterDraft: [],
        dateFilters: [],
        dateFiltersDraft: [],
        dateFilterUiVersion: 2
      }
    };
    reportSheets = [{
      id: 'unique_record_sheet',
      name: 'Unique records',
      widgets: [uniqueReport]
    }];
    activeSheetId = 'unique_record_sheet';
    renderSheet();
    await refreshWidget(uniqueReport);
    check('Multiple measures share one spreadsheet header level', widgetElement(uniqueReport
      .id).querySelectorAll('[data-row-kind="header"]').length === 1);
    const uniqueSnapshot = () => reportDisplaySnapshots.get(uniqueReport.id).aggregates;
    const uniqueValue = name => reportMetricValue('metric_' + name, uniqueSnapshot().totals
      .get(0));
    check('Grand Total counts each transaction ID once across groups', uniqueValue(
      'revenue') === 200 && uniqueValue('txn_count') === 2);
    check('Equal amounts from different transaction IDs are both retained', uniqueValue(
      'revenue') !== 100);
    const uniqueGroups = new Map([...uniqueSnapshot().buckets.values()].map(bucket => [
      bucket.x, reportMetricValue('metric_revenue', bucket)
    ]));
    check(
      'Displayed groups retain their records while repeated IDs within a group deduplicate',
      uniqueGroups.get('A') === 100 && uniqueGroups.get('B') === 200);
    check('Average and derived ratios recompute from unique record contributions',
      uniqueValue('average_revenue') === 100 && uniqueValue('revenue_per_tx') === 100);
    check('Distinct-user Grand Total remains one despite multiple transactions',
      uniqueValue('unique_users') === 1);
    check('Unique Table Sum matches unique source revenue and user totals', uniqueValue(
      'table_revenue') === 200 && uniqueValue('table_users') === 1);
    check('Repeated table totals are not added again in Grand Total', [...uniqueSnapshot()
      .buckets.values()
    ].every(bucket => reportMetricValue('metric_table_revenue', bucket) === 200));
    const twiceMerged = mergeReportAggregates([...uniqueSnapshot().buckets.values(), ...
      uniqueSnapshot().buckets.values()
    ]);
    check('Merging repeated report buckets retains unique record totals', reportMetricValue(
      'metric_revenue', twiceMerged) === 200);
    check('Record identities use source primary IDs', ReportingTools.recordIdentity(
      'transaction_records', {
        transaction_records: {
          transaction_id: 42,
          user_id: 99
        }
      }) === 42 && ReportingTools.recordIdentity('subscription_records', {
      subscription_records: {
        subscription_id: 56
      }
    }) === 56);
    uniqueReport.config.xFields = uniqueMeasureNames.map(name => ({
      kind: 'metric',
      id: 'metric_' + name
    }));
    uniqueReport.config.yFields = [{
      kind: 'dimension',
      id: 'attr_processor'
    }];
    renderSheet();
    await refreshWidget(uniqueReport);
    check('Vertical spreadsheet Grand Totals use the same unique records', uniqueValue(
      'revenue') === 200 && uniqueValue('table_revenue') === 200);
    reportAggregationWorkerDisabled = true;
    reportAggregateCache.clear();
    await refreshWidget(uniqueReport);
    check('Page fallback matches worker unique Grand Total and Table Sum', uniqueValue(
      'revenue') === 200 && uniqueValue('table_revenue') === 200 && uniqueValue(
      'table_users') === 1);
    reportAggregationWorkerDisabled = workerBeforeUnique;
    const tableRevenueDefinition = customMetrics.find(metric => metric.id ===
      'metric_table_revenue');
    const partitionBuckets = uniqueSnapshot().buckets,
      partitionTotals = uniqueSnapshot().totals;
    applyReportTableCalculations(partitionBuckets, partitionTotals, ['A'], [
      'metric_table_revenue'
    ]);
    check('Visible Table Sum uses unique IDs only within its visible scope',
      reportMetricValue('metric_table_revenue', partitionTotals.get(0)) === 100);
    tableRevenueDefinition.tableScope = 'filtered';
    applyReportTableCalculations(partitionBuckets, partitionTotals, ['A'], [
      'metric_table_revenue'
    ]);
    check('Filtered Table Sum includes the complete unique filtered record set',
      reportMetricValue('metric_table_revenue', partitionTotals.get(0)) === 200);
    tableRevenueDefinition.tableScope = 'visible';
    repeatedTransactions.push({
      ...repeatedTransactions[2],
      transaction_id: 44,
      gross_amount: '300.00',
      net_amount: '300.00'
    });
    reportAggregateCache.clear();
    await refreshWidget(uniqueReport);
    check(
      'Averages and ratios use unique weighted source counts rather than displayed averages',
      Math.abs(uniqueValue('average_revenue') - 500 / 3) < 1e-10 && Math.abs(uniqueValue(
        'revenue_per_tx') - 500 / 3) < 1e-10 && uniqueValue('table_revenue') === 500);
    generateStudioBatch = generationBeforeUnique;
    appState = stateBeforeUnique;
    // Explicit partition/order calculations: values remain attached to cells after display sorting.
    const orderedDefinitions = resolveLookmlDefinitions(`
      dimension: state {type: string
        sql: \${user_records.state} ;;
      }
      date: payment_date {type: date
        sql: date(\${transaction_records.transaction_ts}) ;;
      }
      measure: amount {type: sum
        sql: \${transaction_records.gross_amount} ;;
      }
      ${['running_sum','running_difference_value','running_difference_percent','previous_value','next_value','table_sum'].map(type=>`measure: ordered_${type} {
        type: ${type}
        sql: {{amount}} ;;
        table_mode: window
        table_scope: visible
        table_partition: state
        table_order: payment_date asc
      }`).join('\n')}
    `);
    customAttributes = orderedDefinitions.dimensions;
    customMetrics = orderedDefinitions.measures;
    const orderedBuckets = new Map(),
      orderedTotals = new Map([
        [0, createReportBucket()]
      ]);
    const windowRows = [
      ['TX', '2026-01-03', 20],
      ['TX', '2026-01-01', 10],
      ['TX', '2026-01-02', 15],
      ['CA', '2026-01-01', 100],
      ['CA', '2026-01-02', 0],
      ['CA', '2026-01-03', 20]
    ];
    windowRows.forEach(([state, date, value], index) => {
      const b = createReportBucket();
      Object.assign(b, {
        period: 0,
        x: String(index),
        facet: 'All',
        series: state,
        fieldValues: {
          attr_state: state,
          attr_payment_date: date
        }
      });
      addUniqueReportRecord(b, 'transaction_records', index, {
        metric_amount: value
      }, [customMetrics.find(m => m.id === 'metric_amount')]);
      orderedBuckets.set(String(index), b);
    });
    const windowIds = customMetrics.map(m => m.id),
      orderedKeys = [...orderedBuckets.keys()];
    applyReportTableCalculations(orderedBuckets, orderedTotals, orderedKeys, windowIds);
    const windowValue = (index, type) => reportMetricValue('metric_ordered_' + type,
      orderedBuckets.get(String(index)));
    check('Running sum excludes current cell and follows explicit chronological order',
      windowValue(1, 'running_sum') === 0 && windowValue(2, 'running_sum') === 10 &&
      windowValue(0, 'running_sum') === 25);
    check('Previous and next values stay inside dimension partitions', windowValue(1,
        'previous_value') === null && windowValue(0, 'next_value') === null &&
      windowValue(2, 'previous_value') === 10 && windowValue(2, 'next_value') === 20 &&
      windowValue(3, 'previous_value') === null);
    check('Running difference uses current minus prior value', windowValue(2,
      'running_difference_value') === 5 && windowValue(0,
      'running_difference_value') === 5);
    check('Percent differences return a fraction and zero denominators stay NULL',
      windowValue(2, 'running_difference_percent') === 0.5 && windowValue(5,
        'running_difference_percent') === null);
    const partitionSum = customMetrics.find(m => m.id === 'metric_ordered_table_sum');
    check('Grand Total unions distinct records across explicit calculation partitions',
      reportWindowTotal(partitionSum, [...orderedBuckets.values()], orderedBuckets,
        orderedKeys) === 165);
    check(
      'Subtotals retain a fixed calculation partition instead of narrowing its denominator',
      reportWindowTotal(partitionSum, [orderedBuckets.get('1')], orderedBuckets,
        orderedKeys) === 45);
    check('Table sum is independent per explicit dimension partition', windowValue(0,
      'table_sum') === 45 && windowValue(3, 'table_sum') === 120);
    const orderedBefore = orderedKeys.map(key => orderedBuckets.get(key).tableValues
      .metric_ordered_running_sum);
    applyReportTableCalculations(orderedBuckets, orderedTotals, [...orderedKeys].reverse(),
      windowIds);
    check('Axis display sorting does not change explicit ordered calculations', JSON
      .stringify(orderedBefore) === JSON.stringify(orderedKeys.map(key => orderedBuckets
        .get(key).tableValues.metric_ordered_running_sum)));
    for (const item of customMetrics.filter(m => m.tableMode === 'window')) item
      .tableOrderFields = [{
        id: 'attr_payment_date',
        direction: 'desc'
      }];
    applyReportTableCalculations(orderedBuckets, orderedTotals, orderedKeys, windowIds);
    check('Descending table_order reverses calculation sequence', windowValue(0,
      'running_sum') === 0 && windowValue(1, 'running_sum') === 35);
    const validWindowSource = serializeLookmlDefinitions();
    check('Dictionary serialization retains explicit order and partition', validWindowSource
      .includes('table_order: payment_date asc') && validWindowSource.includes(
        'table_partition: state'));
    let badPartition = '';
    try {
      resolveLookmlDefinitions(validWindowSource.replaceAll('table_partition: state',
        'table_partition: payment_date'));
    } catch (e) {
      badPartition = e.message;
    }
    check('Date partitions are rejected with a table_order correction', badPartition
      .includes('Dates are not allowed') && badPartition.includes('table_order'));
    let badOrder = '';
    try {
      resolveLookmlDefinitions(validWindowSource.replaceAll('table_order: payment_date asc',
        'table_order: missing_field desc'));
    } catch (e) {
      badOrder = e.message;
    }
    check('Unknown table_order fields report a validation error', badOrder.includes(
      'Unknown table_order'));
    check('Partition and order fields require unambiguous report cell grain',
      validateReportPlan({
        xFields: [],
        yFields: [{
          kind: 'metric',
          id: 'metric_ordered_running_sum'
        }],
        dateFilters: [],
        filters: []
      }, ['metric_ordered_running_sum']).some(message => message.includes(
        'unambiguous cell grain')));
    check('Canvas menu offers at least ten formats', REPORT_CANVAS_FORMATS.length >= 10 &&
      $('reportCanvasFormat').options.length >= 10);
    const beforeGeometry = JSON.stringify(activeSheet().widgets.map(w => [w.gridColumn, w
      .gridRow, w.colSpan, w.rowSpan
    ]));
    activeSheet().canvasFormat = 'a4_portrait';
    applyReportCanvasFormat();
    check('Canvas page boundaries preserve module geometry', !$('reportPageBoundary')
      .hidden && $('reportPageBoundary').style.width === '794px' && beforeGeometry ===
      JSON.stringify(activeSheet().widgets.map(w => [w.gridColumn, w.gridRow, w.colSpan, w
        .rowSpan
      ])));
    activeSheet().canvasFormat = 'canvas';
    applyReportCanvasFormat();
    setReportView('generator');
    check('Canvas format is hidden outside Reporting', getComputedStyle($(
      'reportCanvasFormat')).display === 'none');
    setReportView('reporting');
    const mergedMatrix = [
      [{
        value: 'State',
        kind: 'corner'
      }, {
        value: 'Count',
        kind: 'column',
        prefix: ['Count']
      }, {
        value: 'Count',
        kind: 'column',
        prefix: ['Count']
      }],
      [{
        value: 'TX',
        kind: 'row',
        prefix: ['TX']
      }, {
        value: '1',
        kind: 'value'
      }, {
        value: '2',
        kind: 'value'
      }],
      [{
        value: 'TX',
        kind: 'row',
        prefix: ['TX']
      }, {
        value: '3',
        kind: 'value'
      }, {
        value: '4',
        kind: 'value'
      }]
    ];
    const mergedSheet = renderSpreadsheetCells(mergedMatrix, ['header', 'data', 'data']),
      mergedVertical = renderSpreadsheetCells(mergedMatrix, ['header', 'data', 'data'],
        true);
    check('Spreadsheet merges repeated column and row headers without merging results',
      mergedSheet.html.includes('colspan="2"') && mergedSheet.html.includes(
        'rowspan="2"') && mergedSheet.csv[0][2] === '' && mergedSheet.csv[2][0] === '' &&
      mergedSheet.csv[2][2] === '4');
    check('Vertical spreadsheet transposes merged headers and CSV consistently',
      mergedVertical.csv[0][2] === '' && mergedVertical.csv[2][0] === '' && mergedVertical
      .csv[2][2] === '4');
    check('Explicit ordering sorts negative and fractional numeric dimensions numerically',
      compareWindowFieldValues('-10', '-2', 'attr_state') < 0 && compareWindowFieldValues(
        '2.5', '2.05', 'attr_state') > 0);
    const tied = customMetrics.find(m => m.id === 'metric_ordered_running_sum');
    tied.tableOrderFields = [{
      id: 'attr_state',
      direction: 'asc'
    }];
    applyReportTableCalculations(orderedBuckets, orderedTotals, orderedKeys, windowIds);
    const tiedValues = orderedKeys.map(key => orderedBuckets.get(key).tableValues[tied.id]);
    applyReportTableCalculations(orderedBuckets, orderedTotals, [...orderedKeys].reverse(),
      windowIds);
    check('Explicit ordering has stable tie handling independent of display sorting', JSON
      .stringify(tiedValues) === JSON.stringify(orderedKeys.map(key => orderedBuckets.get(
        key).tableValues[tied.id])));
    // Verify the real module UI with a seeded source fixture, including cached totals toggles.
    customAttributes = identityDefinitions.dimensions;
    customMetrics = identityDefinitions.measures;
    definitionRevision++;
    generateStudioBatch = async () => ({
      data: identityData,
      scheduleEvents: []
    });
    appState = {
      ...stateBeforeUnique,
      count: 1,
      runId: 'module-controls-regression'
    };
    uniqueReport.config = {
      chartType: 'spreadsheet',
      xFields: [{
        kind: 'dimension',
        id: 'attr_processor'
      }],
      yFields: [{
        kind: 'metric',
        id: 'metric_revenue'
      }],
      filters: [],
      filterDraft: [],
      dateFilters: [],
      dateFiltersDraft: [],
      dateFilterUiVersion: 2
    };
    reportSheets = [{
      id: 'control_sheet',
      name: 'Controls',
      widgets: [uniqueReport]
    }];
    activeSheetId = 'control_sheet';
    renderSheet();
    await refreshWidget(uniqueReport);
    check('Single-measure spreadsheet hides its visible measure header', ![...widgetElement(
      uniqueReport.id).querySelectorAll('.report-table th')].some(cell => cell
      .textContent === 'revenue'));
    check('Grand Total is displayed by default', widgetElement(uniqueReport.id)
      .querySelector('.report-table').textContent.includes('Grand Total'));
    uniqueReport.config.showGrandTotal = false;
    await redrawDisplayedReport(uniqueReport);
    check('Grand Total toggle redraws from cached data', !widgetElement(uniqueReport.id)
      .querySelector('.report-table').textContent.includes('Grand Total') && !uniqueReport
      .lastSpreadsheetCsvRows.flat().includes('Grand Total'));
    const lock = widgetElement(uniqueReport.id).querySelector('[data-module-select]');
    lock.checked = true;
    lock.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    check('Individual checkbox locks only its module and persists lock state', uniqueReport
      .locked && widgetElement(uniqueReport.id).dataset.locked === 'true' && !
      activeSheet().layoutLocked);
    const moduleRect = widgetElement(uniqueReport.id).getBoundingClientRect();
    surfaceDrag = null;
    startSurfaceDrag({
      button: 0,
      target: widgetElement(uniqueReport.id).querySelector('.widget-content'),
      clientX: moduleRect.x + 30,
      clientY: moduleRect.y + 30,
      pointerId: 77
    });
    check('Locked module cannot start a surface move', surfaceDrag === null);
    lock.checked = false;
    lock.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    check('Module lock can be released', !uniqueReport.locked);
    uniqueReport.config.chartType = 'metric_card';
    renderSheet();
    await refreshWidget(uniqueReport);
    check('Single-measure Metric Card keeps only the value', !widgetElement(uniqueReport.id)
      .querySelector('.metric-card span') && !!widgetElement(uniqueReport.id)
      .querySelector('.metric-card strong'));
    uniqueReport.config.chartType = 'spreadsheet';
    uniqueReport.config.xFields = [];
    uniqueReport.config.yFields = [{
      kind: 'dimension',
      id: 'attr_processor'
    }, {
      kind: 'metric',
      id: 'metric_revenue'
    }, {
      kind: 'metric',
      id: 'metric_txn_count'
    }];
    renderSheet();
    await refreshWidget(uniqueReport);
    let headerRows = [...widgetElement(uniqueReport.id).querySelectorAll(
      '[data-row-kind="header"]')];
    check('Dimension above measures merges values over each measure group', headerRows
      .length === 2 && headerRows[0].querySelector('th[colspan="2"]')?.textContent ===
      'A' && headerRows[1].textContent === 'Categoryrevenuetxn_countrevenuetxn_count');
    uniqueReport.config.yFields = [{
      kind: 'metric',
      id: 'metric_revenue'
    }, {
      kind: 'metric',
      id: 'metric_txn_count'
    }, {
      kind: 'dimension',
      id: 'attr_processor'
    }];
    renderSheet();
    await refreshWidget(uniqueReport);
    headerRows = [...widgetElement(uniqueReport.id).querySelectorAll(
      '[data-row-kind="header"]')];
    check('Dimension below measures nests values beneath each measure header', headerRows
      .length === 2 && headerRows[0].querySelector('th[colspan="2"]')?.textContent ===
      'revenue' && headerRows[1].textContent === 'CategoryABAB');
    // Two category levels produce actual distinct-record subtotals in either orientation.
    const nestedDefinitions = resolveLookmlDefinitions(serializeLookmlDefinitions() +
      `\ndimension: transaction_kind {type: string\n sql: \${transaction_records.transaction_type} ;;\n}`
    );
    customAttributes = nestedDefinitions.dimensions;
    customMetrics = nestedDefinitions.measures;
    definitionRevision++;
    uniqueReport.config.chartType = 'spreadsheet';
    uniqueReport.config.xFields = [{
      kind: 'dimension',
      id: 'attr_processor'
    }, {
      kind: 'dimension',
      id: 'attr_transaction_kind'
    }];
    uniqueReport.config.yFields = [{
      kind: 'metric',
      id: 'metric_revenue'
    }];
    uniqueReport.config.showGrandTotal = true;
    uniqueReport.config.showSubtotals = true;
    renderSheet();
    await refreshWidget(uniqueReport);
    check('Nested spreadsheet subtotals appear when enabled', widgetElement(uniqueReport.id)
      .querySelectorAll('[data-row-kind="subtotal"]').length === 2 && uniqueReport
      .lastSpreadsheetCsvRows.flat().includes('B Subtotal'));
    uniqueReport.config.xFields = [{
      kind: 'metric',
      id: 'metric_revenue'
    }];
    uniqueReport.config.yFields = [{
      kind: 'dimension',
      id: 'attr_processor'
    }, {
      kind: 'dimension',
      id: 'attr_transaction_kind'
    }];
    renderSheet();
    await refreshWidget(uniqueReport);
    check('Vertical spreadsheets retain subtotal columns', widgetElement(uniqueReport.id)
      .querySelectorAll('.subtotal-cell').length > 0 && uniqueReport
      .lastSpreadsheetCsvRows.flat().includes('B Subtotal'));
    uniqueReport.config.showSubtotals = false;
    await redrawDisplayedReport(uniqueReport);
    check('Subtotals toggle removes them from display and CSV', !uniqueReport
      .lastSpreadsheetCsvRows.flat().includes('B Subtotal'));
    // Execute the new window definitions through the real aggregation worker and page fallback.
    customAttributes = orderedDefinitions.dimensions;
    customMetrics = orderedDefinitions.measures;
    definitionRevision++;
    for (const item of customMetrics.filter(m => m.tableMode === 'window')) item
      .tableOrderFields = [{
        id: 'attr_payment_date',
        direction: 'asc'
      }];
    const orderedData = {
      ...identityData,
      user_records: [{
        ...identityData.user_records[0],
        state: 'TX'
      }],
      transaction_records: [{
        ...repeatedTransactions[0],
        transaction_id: 1001,
        transaction_ts: '2026-01-01T12:00:00Z',
        gross_amount: '10.00'
      }, {
        ...repeatedTransactions[0],
        transaction_id: 1002,
        transaction_ts: '2026-01-03T12:00:00Z',
        gross_amount: '20.00'
      }]
    };
    generateStudioBatch = async () => ({
      data: orderedData,
      scheduleEvents: []
    });
    appState = {
      ...appState,
      runId: 'ordered-worker-regression'
    };
    uniqueReport.config = {
      chartType: 'spreadsheet',
      xFields: [{
        kind: 'dimension',
        id: 'attr_payment_date',
        sortDirection: 'descending'
      }],
      yFields: [{
        kind: 'metric',
        id: 'metric_ordered_previous_value'
      }, {
        kind: 'metric',
        id: 'metric_ordered_running_sum'
      }, {
        kind: 'dimension',
        id: 'attr_state'
      }],
      filters: [],
      filterDraft: [],
      dateFilters: [],
      dateFiltersDraft: [],
      dateFilterUiVersion: 2,
      dateRange: {
        period: 'custom',
        start: '2026-01-01',
        end: '2026-01-03'
      }
    };
    uniqueReport.config.dateFilters = [{
      id: 'ordered_dates',
      dimension: 'attr_payment_date',
      enabled: true,
      role: 'cohort',
      range: {
        period: 'custom',
        start: '2026-01-01',
        end: '2026-01-03'
      }
    }];
    uniqueReport.config.dateFiltersDraft = JSON.parse(JSON.stringify(uniqueReport.config
      .dateFilters));
    renderSheet();
    await refreshWidget(uniqueReport);
    const workerWindows = () => [...reportDisplaySnapshots.get(uniqueReport.id).aggregates
      .buckets.values()
    ].filter(b => b.period === 0).sort((a, b) => Number(a.x) - Number(b.x));
    check('Worker passes partition and order field values into aggregate cells',
      workerWindows().every(b => b.fieldValues.attr_state === 'TX' && b.fieldValues
        .attr_payment_date));
    check('Previous value honors an empty visible date cell rather than skipping it',
      workerWindows().length === 3 && reportMetricValue('metric_ordered_previous_value',
        workerWindows()[2]) === null && reportMetricValue('metric_ordered_running_sum',
        workerWindows()[2]) === 10);
    const workerWindowValues = workerWindows().map(b => [b.x, b.tableValues]);
    reportAggregationWorkerDisabled = true;
    reportAggregateCache.clear();
    await refreshWidget(uniqueReport);
    check('Ordered window results agree between worker and page fallback', JSON.stringify(
      workerWindowValues) === JSON.stringify(workerWindows().map(b => [b.x, b
      .tableValues
    ])));
    reportAggregationWorkerDisabled = workerBeforeUnique;
    generateStudioBatch = generationBeforeUnique;
    appState = stateBeforeUnique;
    $('definitionEditor').value = validWindowSource;
    renderDefinitionCardStack();
    setReportView('dictionary');
    const folders = [...$('definitionCards').querySelectorAll('.definition-label-stack')];
    folders.forEach(folder => folder.open = true);
    const definitionCards = [...$('definitionCards').querySelectorAll(
      '[data-definition-card]')];
    definitionCards[0].open = true;
    await new Promise(resolve => setTimeout(resolve, 30));
    definitionCards[1].open = true;
    await new Promise(resolve => setTimeout(resolve, 30));
    check('Only one Dictionary definition editor can be expanded', $('definitionCards')
      .querySelectorAll('[data-definition-card][open]').length === 1);
    check('Expanded Dictionary editor floats at a readable size', getComputedStyle(
        definitionCards[1]).position === 'fixed' && definitionCards[1]
      .getBoundingClientRect().width > innerWidth * 0.5);
    definitionCards[1].querySelector('[data-definition-close-card]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    check('Definition names match folder typography without forced uppercase',
      getComputedStyle(definitionCards[1].querySelector('summary span')).fontSize ===
      getComputedStyle(folders[0].querySelector('summary')).fontSize && getComputedStyle(
        definitionCards[1].querySelector('summary span')).textTransform === 'none');
    check('Definition editor closes without removing its draft', !definitionCards[1].open &&
      !!definitionCards[1].querySelector('textarea').value);
    // Definition visibility, deletion, and saved/draft/error states.
    {
      const visibilitySource = `dimension: customer_state {
 label: "Customers"
 type: string
 sql: \${user_records.state} ;;
}
measure: customer_count {
 label: "Customers"
 type: count
 sql: \${user_records.user_id} ;;
}
measure: doubled_count {
 label: "Customers"
 type: number
 sql: {{customer_count}} * 2 ;;
}`;
      const visibilityDefinitions = resolveLookmlDefinitions(visibilitySource);
      customAttributes = visibilityDefinitions.dimensions;
      customMetrics = visibilityDefinitions.measures;
      definitionRevision++;
      $('definitionEditor').value = serializeLookmlDefinitions();
      renderDefinitionCardStack('customer_state');
      await sleep(30);
      const findCard = name => [...$('definitionCards').querySelectorAll(
        '[data-definition-card]')].find(card => card.querySelector('textarea').value
        .includes(': ' + name + ' {'));
      let stateCard = findCard('customer_state');
      check('Applied valid card is green with a readable saved status', stateCard.dataset
        .definitionStatus === 'saved' && stateCard.querySelector(
          '[data-definition-status-label]').textContent.includes('Saved') &&
        getComputedStyle(stateCard).backgroundColor === 'rgb(237, 246, 236)');
      stateCard.querySelector('textarea').click();
      check('Clicking inside the editor keeps it open', stateCard.open);
      let stateInput = stateCard.querySelector('textarea');
      stateInput.value = stateInput.value.replace('Customers', 'Customer Geography');
      stateInput.dispatchEvent(new Event('input', {
        bubbles: true
      }));
      await sleep(260);
      check('Valid unsaved edits turn the card yellow', stateCard.dataset
        .definitionStatus === 'draft' && stateCard.querySelector(
          '[data-definition-status-label]').textContent === 'Needs saving');
      const pendingState = stateInput.value;
      document.body.click();
      await sleep(30);
      stateCard = findCard('customer_state');
      stateInput = stateCard.querySelector('textarea');
      check('Outside click applies valid changes, closes the editor, and saves green', !
        stateCard.open && !document.body.classList.contains('definition-editor-open') &&
        stateCard.dataset.definitionStatus === 'saved' && customAttributes.find(d => d
          .lookmlName === 'customer_state').name === 'Customer Geography' && localStorage
        .getItem('syntheticGeneratorDictionaryDraft').includes('Customer Geography'));
      stateCard.open = true;
      await sleep(20);
      stateInput.value = stateInput.value.replace('user_records.state',
        'user_records.missing_column');
      stateInput.dispatchEvent(new Event('input', {
        bubbles: true
      }));
      await sleep(260);
      check('Invalid definition is red and error takes priority over unsaved', stateCard
        .dataset.definitionStatus === 'error' && getComputedStyle(stateCard)
        .backgroundColor === 'rgb(251, 233, 231)' && stateCard.querySelector(
          '[data-definition-status-label]').textContent === 'Error');
      check('Invalid field is underlined precisely without replacing native textarea',
        stateInput.getAttribute('aria-invalid') === 'true' && stateCard.querySelector(
          '.definition-error-token')?.textContent === '${user_records.missing_column}' &&
        getComputedStyle(stateCard.querySelector('.definition-error-layer'))
        .pointerEvents === 'none');
      document.body.click();
      await sleep(30);
      check(
        'Invalid outside click keeps editor open and preserves last valid applied definition',
        stateCard.open && customAttributes.find(d => d.lookmlName === 'customer_state')
        .source === 'user_records.state' && stateInput.value.includes('missing_column'));
      $('generatorTab').click();
      check('Invalid outside click does not navigate away from the error', !$(
        'dictionaryView').hidden && stateCard.open);
      const functionSource = 'sql: MYSTERY(1) ;;',
        functionRange = definitionErrorRanges(functionSource,
          'Unsupported SQL token: MYSTERY.')[0];
      check('Unknown function diagnostics underline the function name', functionSource
        .slice(functionRange.start, functionRange.end) === 'MYSTERY');
      const caseSource = 'sql: case when 1=1 then 1 ;;',
        caseRange = definitionErrorRanges(caseSource, 'CASE expression requires END.')[0];
      check('Structural SQL errors underline the relevant SQL line', caseSource.slice(
        caseRange.start, caseRange.end) === caseSource);
      check('An invalid draft does not mark unrelated applied cards red', findCard(
        'customer_count').dataset.definitionStatus === 'saved');
      stateInput.value = pendingState.replace('Customer Geography', 'Updated Geography');
      stateInput.dispatchEvent(new Event('input', {
        bubbles: true
      }));
      await sleep(260);
      check('Correcting an error restores yellow until Apply', stateCard.dataset
        .definitionStatus === 'draft');
      check('Correcting errors removes underlines and aria-invalid', stateInput
        .getAttribute('aria-invalid') === 'false' && !stateCard.querySelector(
          '.definition-error-layer'));
      check('Apply succeeds for corrected card', applyIndividualDefinition(stateCard.dataset
        .definitionCard));
      stateCard = findCard('customer_state');
      check('Apply returns card to green and saves changes', stateCard.dataset
        .definitionStatus === 'saved' && customAttributes.find(d => d.lookmlName ===
          'customer_state').name === 'Updated Geography');
      const updatedInput = stateCard.querySelector('textarea');
      updatedInput.value = updatedInput.value.replace('Updated Geography',
        'Final Geography');
      updatedInput.dispatchEvent(new Event('input', {
        bubbles: true
      }));
      findCard('customer_count').querySelector('summary').click();
      await sleep(30);
      check('Clicking another card saves edits and opens the intended replacement card',
        customAttributes.find(d => d.lookmlName === 'customer_state').name ===
        'Final Geography' && findCard('customer_count').open);
      document.body.click();
      stateCard = findCard('customer_state');
      await sleep(20);
      check('Collapsed cards expose an accessible delete button', !stateCard.open &&
        stateCard.querySelector('summary [data-definition-remove]').getAttribute(
          'aria-label') === 'Delete customer_state');
      const originalConfirm = window.confirm;
      window.confirm = () => false;
      stateCard.querySelector('summary [data-definition-remove]').click();
      await sleep(20);
      check('Cancelling deletion keeps the card collapsed and the definition intact', !
        stateCard.open && !!customAttributes.find(d => d.lookmlName === 'customer_state'));
      window.confirm = () => true;
      stateCard.querySelector('summary [data-definition-remove]').click();
      await sleep(30);
      check('Delete from collapsed card removes draft and applied definition', !findCard(
          'customer_state') && !customAttributes.some(d => d.lookmlName ===
          'customer_state') && !localStorage.getItem('syntheticGeneratorDictionaryDraft')
        .includes('dimension: customer_state'));
      const parent = findCard('customer_count');
      parent.querySelector('summary [data-definition-remove]').click();
      await sleep(20);
      check('Deletion protects definitions used by other calculations', !!findCard(
        'customer_count') && customMetrics.some(m => m.lookmlName === 'customer_count'));
      const child = findCard('doubled_count');
      child.querySelector('summary [data-definition-remove]').click();
      await sleep(20);
      check('Unused measure can be deleted directly without opening its editor', !findCard(
        'doubled_count') && !customMetrics.some(m => m.lookmlName === 'doubled_count'));
      window.confirm = originalConfirm;
      const originalProjectDictionary = window.__SUBSCRIPTION_GENERATOR_DICTIONARY__;
      window.__SUBSCRIPTION_GENERATOR_DICTIONARY__ = {
        definitionText: visibilitySource
      };
      loadReporting();
      check(
        'Deleted definitions stay deleted on reload even when bundled defaults contain them',
        !$('definitionEditor').value.includes('dimension: customer_state') && !
        customAttributes.some(d => d.lookmlName === 'customer_state'));
      window.__SUBSCRIPTION_GENERATOR_DICTIONARY__ = originalProjectDictionary;

    }
    log('RESULT:' + JSON.stringify({
      checks,
      viewport: innerWidth,
      parameterCardValues: cardValues
    }));
  })().catch(e => window.webkit.messageHandlers.benchmark.postMessage('ERROR:' + e.message +
    '\n' + e.stack));
};
