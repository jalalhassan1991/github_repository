// Canonical application source. build.py embeds this file into the HTML and launchers.
(() => {
  const ReportingTools = createReportingTools();
  // Data tables, billing plans, and synthetic-data settings
  const TABLES = [
    ['user_records', 'Users'],
    ['marketing_records', 'Marketing'],
    ['subscription_records', 'Subscriptions'],
    ['subscription_change_records', 'Status history'],
    ['scheduled_subscription_payment_records', 'Scheduled payments'],
    ['transaction_records', 'Transactions'],
    ['failed_transactions', 'Failed attempts']
  ];
  const COLUMNS = {
    user_records: ['user_id', 'signup_ts', 'campaign_source', 'campaign_name', 'first_name',
      'last_name', 'state', 'city', 'zipcode', 'dob', 'email', 'update_ts'
    ],
    marketing_records: ['marketing_record_id', 'date', 'campaign_source', 'campaign_name',
      'views', 'views_est', 'clicks', 'visits', 'visits_est', 'cost', 'update_ts'
    ],
    subscription_records: ['subscription_id', 'user_id', 'subscription_length',
      'trial_start_ts', 'subscription_start_ts', 'subscription_end_ts', 'subscription_type',
      'subscription_status', 'cancel_status', 'gross_revenue', 'net_revenue',
      'total_discount', 'total_tax', 'total_transactions', 'failed_transactions', 'refunds',
      'chargebacks', 'last_update_ts'
    ],
    subscription_change_records: ['subscription_change_id', 'user_id', 'subscription_id',
      'subscription_status', 'cancel_reason', 'subscription_length', 'change_reason',
      'change_ts', 'update_ts'
    ],
    scheduled_subscription_payment_records: ['scheduled_payment_id', 'user_id',
      'subscription_id', 'transaction_id', 'renewal_number', 'scheduled_payment_ts',
      'transaction_ts', 'gross_amount', 'discount_amount', 'scheduled_amount', 'tax_amount',
      'declined_transactions', 'payment_status', 'update_ts'
    ],
    transaction_records: ['transaction_id', 'user_id', 'subscription_id', 'schedule_id',
      'transaction_ts', 'transaction_type', 'payment_processor', 'credit_or_debit',
      'card_brand', 'gross_amount', 'discount_amount', 'tax_rate', 'tax_amount', 'net_amount',
      'refund_amount', 'refund_id', 'chargeback_amount', 'chargeback_id', 'update_ts'
    ],
    failed_transactions: ['failed_transaction_id', 'user_id', 'subscription_id',
      'transaction_id', 'fail_error', 'update_ts'
    ]
  };
  const PLAN = {
    1: {
      price: 24.99,
      days: 30,
      horizon: 36
    },
    3: {
      price: 69.99,
      days: 90,
      horizon: 12
    },
    12: {
      price: 274.99,
      days: 365,
      horizon: 3
    }
  };
  const SOURCES = ['SEM', 'SEO', 'Affiliate', 'Directload', 'TV', 'Radio'];
  const FAIL_ERRORS = ['insufficient_funds', 'wrong_zipcode', 'wrong_name', 'blocked_card',
    'wrong_cvc', 'invalid_number'
  ];
  const MARKETING_NAMES = {
    SEM: ['Autumn_Search_Refresh', 'Brand_Search_Core', 'Intent_Capture_Test',
      'Seasonal_Search_Push'
    ],
    SEO: ['Evergreen_Content_Growth', 'Organic_Landing_Pages', 'Editorial_Discovery',
      'Technical_SEO_Refresh'
    ],
    Affiliate: ['Partner_Pilot_North', 'Creator_Referral_Group', 'Publisher_Growth_Test',
      'Rewards_Partner_Network'
    ],
    Directload: ['Directload'],
    TV: ['Prime_Time_Reach', 'Local_Broadcast_Burst', 'Weekend_Viewing_Plan',
      'Streaming_Awareness'
    ],
    Radio: ['Regional_Morning_Spot', 'Drive_Time_Reach', 'Local_Audio_Test',
      'Weekend_Radio_Buy'
    ]
  };
  const PEOPLE = [
    ['Avery', 'Nguyen'],
    ['Jordan', 'Reed'],
    ['Maya', 'Patel'],
    ['Noah', 'Brooks'],
    ['Sofia', 'Ramirez'],
    ['Ethan', 'Kim'],
    ['Amara', 'Johnson'],
    ['Leo', 'Martinez'],
    ['Nina', 'Carter'],
    ['Owen', 'Chen'],
    ['Zoe', 'Williams'],
    ['Isaac', 'Rivera'],
    ['Mila', 'Thompson'],
    ['Caleb', 'Davis'],
    ['Layla', 'Wilson'],
    ['Theo', 'Anderson'],
    ['Priya', 'Shah'],
    ['Miles', 'Turner'],
    ['Elena', 'Garcia'],
    ['Kai', 'Morgan']
  ];
  const PLACES = [
    ['CA', 'San Diego', '92101'],
    ['NY', 'Albany', '12207'],
    ['TX', 'Austin', '78701'],
    ['WA', 'Seattle', '98101'],
    ['CO', 'Denver', '80202'],
    ['IL', 'Chicago', '60601'],
    ['MA', 'Boston', '02108'],
    ['GA', 'Atlanta', '30303'],
    ['AZ', 'Phoenix', '85004'],
    ['OR', 'Portland', '97201'],
    ['FL', 'Tampa', '33602'],
    ['NC', 'Charlotte', '28202']
  ];
  const SOURCE_WEIGHTS = [.31, .22, .16, .12, .11, .08],
    PLACE_WEIGHTS = [.19, .08, .14, .09, .06, .10, .05, .08, .07, .05, .06, .03],
    PERSON_WEIGHTS = [.12, .10, .09, .08, .08, .07, .07, .06, .06, .05, .04, .04, .03, .03, .02,
      .02, .02, .01, .005, .005
    ];
  const $ = id => document.getElementById(id);
  let hadStoredWorkspace = !!localStorage.getItem('syntheticGeneratorReporting');
  let tables = null,
    rng = Math.random,
    appState = null,
    generationOptions = null,
    customAttributes = [],
    customMetrics = [],
    definitionHistory = [],
    reportSheets = [{
      id: 'sheet_1',
      name: 'Sheet 1',
      widgets: []
    }],
    activeSheetId = 'sheet_1',
    dictionaryMode = 'tables',
    editingWidgetId = null,
    editingDictionaryId = null,
    sheetCounter = 1,
    dimensionValueCache = {},
    reportSidebarWidth = 360,
    sidebarResizeState = null,
    generationCancelRequested = false,
    generationWarnings = new Set(),
    autosaveTimer = null,
    generationRunCounter = 0,
    definitionRevision = 0,
    dictionaryProjectHandle = null;
  const expressionFunctionCache = new Map(),
    expressionPreparationCache = new Map();
  const option = id => generationOptions ? generationOptions[id] : $(id).checked;
  const toast = (msg) => {
    const e = $('toast');
    e.textContent = msg;
    e.classList.add('show');
    setTimeout(() => e.classList.remove('show'), 2600)
  };

  function seeded(seed) {
    let s = Number(seed) >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const rand = (a, b) => Math.floor(rng() * (b - a + 1)) + a,
    pick = a => a[Math.floor(rng() * a.length)],
    chance = p => rng() < p;
  const weightedPick = (items, weights) => {
    const activeWeights = generationOptions?.distributionMode === 'uniform' ? items.map(() =>
      1) : weights;
    let cursor = rng() * activeWeights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < items.length; i++) {
      cursor -= activeWeights[i];
      if (cursor < 0) return items[i]
    }
    return items[items.length - 1]
  };

  function persistGeneratorSettings() {
    clearTimeout(autosaveTimer);
    const state = $('autosaveState');
    if (state) state.textContent = 'Saving…';
    autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem('syntheticGeneratorSettings', JSON.stringify({
          userCount: $('userCount').value,
          historyDays: $('historyDays').value,
          seed: $('seed').value,
          distributionMode: $('distributionMode')?.value || 'weighted',
          options: Object.fromEntries(['optDiscount', 'optFailures', 'optChanges',
            'optCancels', 'optOneTime', 'optChargebacks'
          ].map(id => [id, $(id)?.checked ?? false]))
        }));
        if (state) {
          state.textContent = 'Autosaved';
          state.title = `Settings saved in this browser · ${new Date().toLocaleTimeString()}`
        }
      } catch (error) {
        if (state) state.textContent = 'Autosave unavailable';
        console.warn('Could not autosave generator settings', error)
      }
    }, 180)
  }

  function restoreGeneratorSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('syntheticGeneratorSettings') || 'null');
      if (!saved) return;
      if (saved.userCount) $('userCount').value = saved.userCount;
      if (saved.historyDays) $('historyDays').value = saved.historyDays;
      if (saved.seed != null) $('seed').value = saved.seed;
      if ($('distributionMode')) $('distributionMode').value = saved.distributionMode ||
        'weighted';
      for (const [id, value] of Object.entries(saved.options || {}))
        if ($(id)) $(id).checked = !!value;
      const state = $('autosaveState');
      if (state) {
        state.textContent = 'Settings restored';
        state.title =
          'Settings, dictionary definitions, and reports are stored in this browser profile'
      }
    } catch (error) {
      console.warn('Could not restore generator settings', error)
    }
  }
  const TAX_RATES = {
    92101: .0725,
    12207: .065,
    78701: .0825,
    98101: .0875,
    80202: .078,
    60601: .09,
    '02108': .06,
    30303: .075,
    85004: .085,
    97201: .07,
    33602: .065,
    28202: .0725
  };
  const taxRateFor = zip => TAX_RATES[zip] ?? .075;
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100,
    money = n => round(n).toFixed(2),
    taxFor = (taxableAmount, taxRate) => -round(Math.abs(taxableAmount) * taxRate),
    financial = (gross, discount = 0, taxRate = 0, refund = 0, chargeback = 0) => {
      const discountAmount = -Math.abs(round(discount)),
        taxable = Math.max(0, round(gross + discountAmount)),
        taxAmount = taxFor(refund < 0 ? Math.abs(refund) : taxable, taxRate);
      return {
        gross_amount: money(gross),
        discount_amount: money(discountAmount),
        tax_rate: taxRate.toFixed(4),
        tax_amount: money(taxAmount),
        net_amount: money(gross + discountAmount + refund + chargeback),
        refund_amount: money(refund),
        chargeback_amount: money(chargeback)
      }
    },
    iso = d => d.toISOString().replace('.000Z', 'Z'),
    day = d => d.toISOString().slice(0, 10),
    addDays = (d, n) => new Date(d.getTime() + n * 86400000);

  function addCalendarMonths(anchor, count) {
    const result = new Date(anchor),
      dayOfMonth = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + count);
    result.setUTCDate(Math.min(dayOfMonth, new Date(Date.UTC(result.getUTCFullYear(), result
      .getUTCMonth() + 1, 0)).getUTCDate()));
    return result
  }

  function remainingFullMonths(anchor, at, termMonths) {
    let elapsed = 0;
    while (elapsed < termMonths && addCalendarMonths(anchor, elapsed + 1) <= at) elapsed++;
    return Math.max(0, termMonths - Math.min(termMonths, elapsed + 1))
  }

  function idFactory(start) {
    let n = start;
    return () => n++
  }

  function randDate(lo, hi) {
    return new Date(lo.getTime() + rng() * (hi.getTime() - lo.getTime()))
  }

  function randEmail(first, last, dob) {
    return `${first}.${last}.${dob}@example.test`.toLowerCase().replace(/[^a-z0-9.@_-]/g, '')
  }

  function makeCampaignNames() {
    const campaign = {};
    for (const s of SOURCES) campaign[s] = s === 'Directload' ? 'Directload' : weightedPick(
      MARKETING_NAMES[s], [.4, .3, .2, .1]);
    return campaign
  }

  function makeMarketing(now, campaign) {
    const rows = [],
      id = idFactory(1);
    const first = new Date(Date.UTC(now.getUTCFullYear() - 10, now.getUTCMonth(), now
      .getUTCDate()));
    for (let dt = new Date(first); dt <= now; dt = addDays(dt, 1)) {
      for (const source of SOURCES) {
        const c = campaign[source],
          base = {
            marketing_record_id: id(),
            date: day(dt),
            campaign_source: source,
            campaign_name: c,
            views: '',
            views_est: '',
            clicks: '',
            visits: '',
            visits_est: '',
            cost: '',
            update_ts: iso(now)
          };
        if (source === 'Directload') {
          base.visits = rand(20, 1800);
          base.cost = money(rand(0, 5000) / 100)
        } else if (source === 'TV' || source === 'Radio') {
          base.views_est = source === 'TV' ? rand(25000, 450000) : rand(8000, 150000);
          base.cost = money(source === 'TV' ? rand(70000, 250000) / 100 : rand(8000, 55000) /
            100);
          base.visits_est = money(base.views_est * (source === 'TV' ? .0028 : .0038) * (0.7 +
            rng() * .6))
        } else {
          base.views = rand(5000, 70000);
          base.clicks = rand(Math.max(30, Math.floor(base.views * .012)), Math.max(45, Math.floor(
            base.views * .075)));
          base.visits = rand(Math.floor(base.clicks * .72), Math.max(Math.floor(base.clicks *
            .73), base.clicks));
          base.cost = money(source === 'SEM' ? base.clicks * (.35 + rng() * 1.75) : rand(1000,
            50000) / 100)
        }
        rows.push(base)
      }
    }
    return {
      rows,
      campaign
    };
  }

  // Synthetic subscription journey generation
  function generate(count, historyDays, offset, campaign, now, reportOnly = false,
    reportScheduleFn = null) {
    const block = Math.floor(offset / 250) * 1000000;
    const userId = idFactory(210001 + offset),
      subId = idFactory(710001 + block),
      changeId = idFactory(810001 + block),
      scheduleId = idFactory(910001 + block),
      txId = idFactory(1010001 + block),
      failedId = idFactory(2010001 + block),
      failedRecordId = idFactory(3010001 + block);
    const users = [],
      subs = [],
      changes = [],
      schedules = [],
      txs = [],
      failed = [],
      userLookup = new Map(),
      subLookup = new Map();
    const addSchedule = row => {
      if (!reportOnly) schedules.push(row);
      else if (reportScheduleFn) reportScheduleFn(row, userLookup.get(String(row.user_id)),
        subLookup.get(String(row.subscription_id)))
    };
    const metrics = {
      upgrades: 0,
      downgrades: 0,
      oneTime: 0,
      failedPayments: 0,
      refunds: 0,
      chargebacks: 0
    };
    const recordChange = (uid, sid, status, length, reason, ts, cancelReason = '') => changes
      .push({
        subscription_change_id: changeId(),
        user_id: uid,
        subscription_id: sid,
        subscription_status: status,
        cancel_reason: cancelReason,
        subscription_length: length,
        change_reason: reason,
        change_ts: iso(ts),
        update_ts: iso(ts)
      });
    const subscriptionTotals = (sid, transactionStart, failedStart) => {
      const rows = txs.slice(transactionStart).filter(t => t.subscription_id === sid),
        charges = rows.filter(t => ['new_subscription', 'renewal', 'upgrade_charge',
          'one_time_purchase'
        ].includes(t.transaction_type));
      return {
        gross_revenue: money(charges.reduce((sum, t) => sum + Number(t.gross_amount), 0)),
        net_revenue: money(rows.reduce((sum, t) => sum + Number(t.net_amount), 0)),
        total_discount: money(rows.reduce((sum, t) => sum - Math.min(0, Number(t
          .discount_amount)), 0)),
        total_tax: money(rows.reduce((sum, t) => sum + (['downgrade_refund', 'general_refund']
            .includes(t.transaction_type) ? -Number(t.tax_amount) : Number(t.tax_amount)),
          0)),
        total_transactions: rows.length,
        failed_transactions: failed.slice(failedStart).filter(t => t.subscription_id === sid)
          .length,
        refunds: money(rows.reduce((sum, t) => sum + Number(t.refund_amount), 0)),
        chargebacks: money(rows.reduce((sum, t) => sum - Math.min(0, Number(t
          .chargeback_amount)), 0))
      }
    };
    for (let u = 0; u < count; u++) {
      const uid = userId(),
        sid = subId(),
        hasPriorSubscription = chance(.18),
        [first, last] = weightedPick(PEOPLE, PERSON_WEIGHTS),
        [state, city, zip] = weightedPick(PLACES, PLACE_WEIGHTS),
        userTransactionStart = txs.length,
        userFailedStart = failed.length;
      const ageFromDobDays = 18 * 365 + Math.floor(Math.pow(rng(), 1.35) * 62 * 365);
      const dob = day(addDays(now, -ageFromDobDays));
      const journeyAgeDays = 10 + Math.floor(Math.pow(rng(), 1.55) * Math.max(0, historyDays -
        10));
      const trialStart = addDays(now, -journeyAgeDays);
      trialStart.setUTCHours(rand(7, 21), rand(0, 59), rand(0, 59), 0);
      const start = addDays(trialStart, 7);
      let firstPay = new Date(start);
      let declinedInitial = 0,
        initialFailureDays = [];
      if (option('optFailures') && chance(.2)) {
        const retryDay = weightedPick([1, 3, 7], [.4, .35, .25]);
        firstPay = addDays(start, retryDay);
        declinedInitial = retryDay === 1 ? 1 : retryDay === 3 ? 2 : 3;
        initialFailureDays = [0, ...[1, 3].filter(d => d < retryDay)]
      }
      metrics.failedPayments += declinedInitial;
      for (const d of initialFailureDays) failed.push({
        failed_transaction_id: failedRecordId(),
        user_id: uid,
        subscription_id: sid,
        transaction_id: failedId(),
        fail_error: weightedPick(FAIL_ERRORS, [.38, .12, .10, .16, .12, .12]),
        update_ts: iso(addDays(start, d))
      });
      const source = weightedPick(SOURCES, SOURCE_WEIGHTS),
        campaignName = campaign[source];
      users.push({
        user_id: uid,
        signup_ts: '',
        campaign_source: source,
        campaign_name: campaignName,
        first_name: first,
        last_name: last,
        state,
        city,
        zipcode: zip,
        dob,
        email: randEmail(first, last, dob),
        update_ts: ''
      });
      userLookup.set(String(uid), users[users.length - 1]);
      let initialLength = weightedPick([1, 3, 12], [.5, .333, .167]),
        currentLength = initialLength,
        initialPrice = PLAN[initialLength].price;
      const discount = option('optDiscount') && chance(.45);
      const initialElapsedDays = Math.max(0, Math.round((firstPay - start) / 86400000));
      const initialProration = declinedInitial ? Math.min(1, initialElapsedDays / PLAN[
        initialLength].days) : 1;
      const initialGross = round(initialPrice * initialProration);
      const initialAmount = discount ? round(initialGross * .85) : initialGross;
      let currentAmount = initialAmount,
        latestSuccessful = firstPay,
        currentTermAnchor = new Date(firstPay),
        currentTermPaidAmount = initialAmount,
        gross = 0,
        tax = 0,
        transactionCount = 0,
        refunds = 0,
        chargebacks = 0;
      let status = 'trial',
        endTs = '',
        cancelStatus = '',
        canceledByFailure = false,
        pendingDecline = false;
      subLookup.set(String(sid), {
        subscription_id: sid,
        user_id: uid,
        subscription_length: currentLength
      });
      recordChange(uid, sid, 'trial', initialLength, 'status_change', trialStart);
      // Initial scheduled payment and its eventual successful capture. Declines are reflected in the schedule count.
      let firstScheduleId = scheduleId();
      const initialTx = txId();
      addSchedule({
        scheduled_payment_id: firstScheduleId,
        user_id: uid,
        subscription_id: sid,
        transaction_id: initialTx,
        renewal_number: 1,
        scheduled_payment_ts: iso(start),
        transaction_ts: iso(firstPay),
        gross_amount: money(initialGross),
        discount_amount: money(initialGross - initialAmount),
        scheduled_amount: money(initialAmount),
        tax_amount: money(taxFor(initialAmount, taxRateFor(zip))),
        declined_transactions: declinedInitial,
        payment_status: 'paid',
        update_ts: iso(firstPay)
      });
      txs.push({
        transaction_id: initialTx,
        user_id: uid,
        subscription_id: sid,
        schedule_id: firstScheduleId,
        transaction_ts: iso(firstPay),
        transaction_type: 'new_subscription',
        payment_processor: weightedPick(['stripe', 'apple_pay', 'google_pay'], [.68, .20,
          .12
        ]),
        credit_or_debit: weightedPick(['credit_card', 'debit_card'], [.72, .28]),
        card_brand: weightedPick(['visa', 'mastercard', 'american_express'], [.48, .32, .20]),
        ...financial(initialGross, initialGross - initialAmount, taxRateFor(zip)),
        refund_id: '',
        chargeback_id: '',
        update_ts: iso(firstPay)
      });
      gross += initialAmount;
      transactionCount++;
      const eligibleOriginals = (at, includeOneTime = false) => txs.filter(t => t
        .subscription_id === sid && ['new_subscription', 'renewal', 'upgrade_charge', ...(
          includeOneTime ? ['one_time_purchase'] : [])].includes(t.transaction_type) && Number(t
          .gross_amount) + Number(t.discount_amount) > 0 && !t.refund_id && !t.chargeback_id &&
        new Date(t.transaction_ts) <= at).sort((a, b) => new Date(a.transaction_ts) - new Date(b
        .transaction_ts));
      const issueRefund = (type, amount, at) => {
        if (!(amount > 0)) return false;
        const originals = eligibleOriginals(at).reverse(),
          capacity = originals.reduce((sum, tx) => sum + Math.max(0, round(Number(tx
            .gross_amount) + Number(tx.discount_amount))), 0);
        if (capacity + 0.001 < amount) return false;
        let remaining = round(amount);
        for (const original of originals) {
          if (remaining <= 0) break;
          const applied = round(Math.min(remaining, Math.max(0, Number(original.gross_amount) +
            Number(original.discount_amount))));
          if (applied <= 0) continue;
          const tid = txId();
          original.refund_id = tid;
          txs.push({
            transaction_id: tid,
            user_id: uid,
            subscription_id: sid,
            schedule_id: '',
            transaction_ts: iso(at),
            transaction_type: type,
            payment_processor: original.payment_processor,
            credit_or_debit: original.credit_or_debit,
            card_brand: original.card_brand,
            ...financial(0, 0, taxRateFor(zip), -applied),
            refund_id: '',
            chargeback_id: '',
            update_ts: iso(at)
          });
          remaining = round(remaining - applied);
          metrics.refunds++;
          refunds += applied;
          transactionCount++
        }
        return remaining <= 0
      };
      status = 'active';
      recordChange(uid, sid, 'active', initialLength, 'status_change', firstPay);
      const createdDate = trialStart;
      const ageDays = Math.max(0, Math.floor((now - firstPay) / 86400000));
      // Optional single plan change; the new term starts a new renewal cadence.
      let planChange = null;
      if (option('optChanges') && ageDays > PLAN[initialLength].days && chance(.3)) {
        const choices = initialLength === 1 ? [3, 12] : initialLength === 3 ? [1, 12] : [1, 3];
        const target = pick(choices);
        const cycle = PLAN[initialLength].days;
        const changeAt = randDate(addDays(firstPay, 1), addDays(firstPay, Math.min(cycle - 1,
          ageDays)));
        const oldLength = currentLength,
          currentPlanGross = PLAN[oldLength].price;
        if (target > initialLength) {
          metrics.upgrades++;
          const due = Math.max(0, round(PLAN[target].price - currentPlanGross));
          if (due > 0) {
            const tid = txId();
            txs.push({
              transaction_id: tid,
              user_id: uid,
              subscription_id: sid,
              schedule_id: '',
              transaction_ts: iso(changeAt),
              transaction_type: 'upgrade_charge',
              payment_processor: weightedPick(['stripe', 'apple_pay', 'google_pay'], [.68,
                .20, .12
              ]),
              credit_or_debit: 'credit_card',
              card_brand: weightedPick(['visa', 'mastercard', 'american_express'], [.48, .32,
                .20
              ]),
              ...financial(due, 0, taxRateFor(zip)),
              refund_id: '',
              chargeback_id: '',
              update_ts: iso(changeAt)
            });
            gross += due;
            currentTermPaidAmount = round(currentTermPaidAmount + due);
            transactionCount++
          }
          planChange = {
            at: changeAt,
            target,
            kind: 'upgrade',
            amount: due || 0
          }
        } else {
          metrics.downgrades++;
          const monthsLeft = remainingFullMonths(currentTermAnchor, changeAt, oldLength),
            monthsToKeep = Math.max(0, target - 1),
            refundMonths = Math.max(0, monthsLeft - monthsToKeep),
            refundAmount = round(currentTermPaidAmount / oldLength * refundMonths),
            processed = issueRefund('downgrade_refund', refundAmount, changeAt);
          if (processed) currentTermPaidAmount = round(currentTermPaidAmount - refundAmount);
          planChange = {
            at: changeAt,
            target,
            kind: 'downgrade',
            amount: processed ? refundAmount : 0
          }
        }
        currentLength = target;
        currentAmount = PLAN[target].price;
        recordChange(uid, sid, status, currentLength, target > initialLength ? 'upgrade' :
          'downgrade', changeAt);
        currentTermAnchor = new Date(changeAt);
      }
      let userCancelAt = null;
      if (option('optCancels') && planChange?.kind !== 'downgrade' && chance(.12) && ageDays >
        5) {
        const earliestRequest = addDays(planChange?.at || firstPay, 1);
        if (earliestRequest <= now) userCancelAt = randDate(earliestRequest, now)
      }
      // Keep prior-term due dates through the change, then renew at the changed term's interval.
      let stopAt = null,
        pendingDue = null;
      const scheduleDues = [];
      for (let n = 2; n <= PLAN[initialLength].horizon; n++) {
        const due = addDays(firstPay, PLAN[initialLength].days * (n - 1));
        if (!planChange || due <= planChange.at) scheduleDues.push(due)
      }
      if (planChange)
        for (let n = 1; n <= PLAN[planChange.target].horizon; n++) scheduleDues.push(addDays(
          planChange.at, PLAN[planChange.target].days * n));
      scheduleDues.sort((a, b) => a - b);
      for (let i = 0; i < scheduleDues.length; i++) {
        const n = i + 2,
          due = scheduleDues[i];
        if (stopAt && due >= stopAt) break;
        const sched = scheduleId();
        let payStatus = 'scheduled',
          dcount = 0,
          transactionId = '',
          transactionTs = '';
        const effectivePlan = planChange && due > planChange.at ? planChange.target :
          initialLength;
        const interval = PLAN[effectivePlan].days;
        if (userCancelAt && due > userCancelAt && !stopAt) {
          const effective = addDays(due, 0);
          const request = userCancelAt;
          cancelStatus = 'user';
          recordChange(uid, sid, 'pending_cancellation', currentLength, 'status_change', request,
            cancelStatus);
          stopAt = effective;
          if (effective <= now) {
            recordChange(uid, sid, 'cancelled', currentLength, 'status_change', effective,
              cancelStatus);
            status = 'cancelled';
            endTs = iso(effective)
          } else {
            status = 'pending_cancellation';
            endTs = ''
          }
          break;
        }
        if (due <= now) {
          const basePrice = PLAN[effectivePlan].price;
          let didFail = option('optFailures') && chance(.16);
          if (didFail) {
            dcount = 1;
            const canRetry = now >= addDays(due, 1);
            let recovered = false,
              retryDay = 0,
              failedDays = [0];
            if (canRetry && chance(.62)) {
              retryDay = weightedPick([1, 3, 7], [.4, .35, .25]);
              if (now >= addDays(due, retryDay)) {
                dcount = retryDay === 1 ? 1 : retryDay === 3 ? 2 : 3;
                failedDays = [0, ...[1, 3].filter(d => d < retryDay)];
                transactionTs = iso(addDays(due, retryDay));
                recovered = true
              }
            }
            if (recovered) {
              payStatus = 'paid';
              transactionId = txId();
              latestSuccessful = new Date(transactionTs);
              currentTermAnchor = new Date(due);
              const elapsedDays = retryDay;
              const recoveryAmount = round(basePrice * Math.min(1, elapsedDays / interval));
              currentTermPaidAmount = recoveryAmount;
              const tid = transactionId;
              txs.push({
                transaction_id: tid,
                user_id: uid,
                subscription_id: sid,
                schedule_id: sched,
                transaction_ts: transactionTs,
                transaction_type: 'renewal',
                payment_processor: weightedPick(['stripe', 'apple_pay', 'google_pay'], [.68,
                  .20, .12
                ]),
                credit_or_debit: weightedPick(['credit_card', 'debit_card'], [.72, .28]),
                card_brand: weightedPick(['visa', 'mastercard', 'american_express'], [.48,
                  .32, .20
                ]),
                ...financial(recoveryAmount, 0, taxRateFor(zip)),
                refund_id: '',
                chargeback_id: '',
                update_ts: transactionTs
              });
              gross += recoveryAmount;
              transactionCount++
            } else if (now >= addDays(due, 7)) {
              dcount = 4;
              failedDays = [0, 1, 3, 7];
              payStatus = 'cancelled';
              status = 'cancelled';
              cancelStatus = 'failed_payment';
              endTs = iso(addDays(due, 7));
              stopAt = addDays(due, 7);
              canceledByFailure = true;
              recordChange(uid, sid, 'pending_cancellation', currentLength, 'status_change', due,
                cancelStatus);
              recordChange(uid, sid, 'cancelled', currentLength, 'status_change', addDays(due, 7),
                cancelStatus)
            } else {
              dcount = 1 + (now >= addDays(due, 1) ? 1 : 0) + (now >= addDays(due, 3) ? 1 : 0);
              failedDays = [0, ...(now >= addDays(due, 1) ? [1] : []), ...(now >= addDays(due,
                3) ? [3] : [])];
              payStatus = 'past_due';
              pendingDue = due;
              status = 'pending_cancellation';
              cancelStatus = 'failed_payment';
              recordChange(uid, sid, 'pending_cancellation', currentLength, 'status_change', due,
                cancelStatus)
            }
            for (const d of failedDays) failed.push({
              failed_transaction_id: failedRecordId(),
              user_id: uid,
              subscription_id: sid,
              transaction_id: failedId(),
              fail_error: weightedPick(FAIL_ERRORS, [.38, .12, .10, .16, .12, .12]),
              update_ts: iso(addDays(due, d))
            });
            metrics.failedPayments += dcount;
          } else {
            payStatus = 'paid';
            transactionId = txId();
            transactionTs = iso(due);
            const price = basePrice;
            txs.push({
              transaction_id: transactionId,
              user_id: uid,
              subscription_id: sid,
              schedule_id: sched,
              transaction_ts: transactionTs,
              transaction_type: 'renewal',
              payment_processor: weightedPick(['stripe', 'apple_pay', 'google_pay'], [.68,
                .20, .12
              ]),
              credit_or_debit: weightedPick(['credit_card', 'debit_card'], [.72, .28]),
              card_brand: weightedPick(['visa', 'mastercard', 'american_express'], [.48, .32,
                .20
              ]),
              ...financial(price, 0, taxRateFor(zip)),
              refund_id: '',
              chargeback_id: '',
              update_ts: transactionTs
            });
            gross += price;
            currentTermPaidAmount = price;
            transactionCount++;
            latestSuccessful = new Date(due);
            currentTermAnchor = new Date(due)
          }
        }
        const grossAmount = PLAN[effectivePlan].price;
        const paidRecovery = payStatus === 'paid' && dcount > 0;
        const recoveryAmount = paidRecovery ? round(grossAmount * Math.min(1, Math.max(1, Math
          .floor((new Date(transactionTs) - due) / 86400000)) / interval)) : grossAmount;
        const bookedGross = paidRecovery ? recoveryAmount : grossAmount;
        addSchedule({
          scheduled_payment_id: sched,
          user_id: uid,
          subscription_id: sid,
          transaction_id: transactionId,
          renewal_number: n,
          scheduled_payment_ts: iso(due),
          transaction_ts: transactionTs,
          gross_amount: money(bookedGross),
          discount_amount: '0.00',
          scheduled_amount: money(recoveryAmount),
          tax_amount: money(taxFor(recoveryAmount, taxRateFor(zip))),
          declined_transactions: dcount,
          payment_status: payStatus,
          update_ts: transactionTs || iso(now)
        });
      }
      if (userCancelAt && currentLength > 1 && !canceledByFailure) {
        const monthsLeft = remainingFullMonths(currentTermAnchor, userCancelAt, currentLength),
          refundAmount = round(currentTermPaidAmount / currentLength * monthsLeft);
        issueRefund('general_refund', refundAmount, userCancelAt)
      }
      if (userCancelAt && status === 'active') {
        const anchor = currentTermAnchor,
          cadence = PLAN[currentLength].days;
        const elapsed = Math.max(0, Math.floor((userCancelAt - anchor) / (cadence * 86400000))),
          effective = addDays(anchor, (elapsed + 1) * cadence);
        cancelStatus = 'user';
        recordChange(uid, sid, 'pending_cancellation', currentLength, 'status_change',
          userCancelAt, cancelStatus);
        if (effective <= now) {
          recordChange(uid, sid, 'cancelled', currentLength, 'status_change', effective,
            cancelStatus);
          status = 'cancelled';
          endTs = iso(effective)
        } else status = 'pending_cancellation';
      }
      // One-time purchases are generated only for subscriptions still active at the dataset snapshot.
      if (option('optOneTime') && status === 'active' && chance(.28)) {
        metrics.oneTime++;
        const purchaseAt = randDate(firstPay, now);
        const amount = weightedPick([5, 10, 15], [.50, .30, .20]);
        const tid = txId();
        txs.push({
          transaction_id: tid,
          user_id: uid,
          subscription_id: sid,
          schedule_id: '',
          transaction_ts: iso(purchaseAt),
          transaction_type: 'one_time_purchase',
          payment_processor: weightedPick(['stripe', 'apple_pay', 'google_pay'], [.68, .20,
            .12
          ]),
          credit_or_debit: weightedPick(['credit_card', 'debit_card'], [.72, .28]),
          card_brand: weightedPick(['visa', 'mastercard', 'american_express'], [.48, .32,
            .20
          ]),
          ...financial(amount, 0, taxRateFor(zip)),
          refund_id: '',
          chargeback_id: '',
          update_ts: iso(purchaseAt)
        });
        gross += amount;
        transactionCount++
      }
      if (option('optChargebacks') && chance(.01)) {
        const original = pick(eligibleOriginals(now, true));
        if (original) {
          metrics.chargebacks++;
          const principal = round(Number(original.gross_amount) + Number(original
              .discount_amount)),
            portion = weightedPick([.5, 1], [.35, .65]),
            amount = round(principal * portion),
            tid = txId(),
            chargebackAt = randDate(new Date(original.transaction_ts), now);
          original.chargeback_id = tid;
          txs.push({
            transaction_id: tid,
            user_id: uid,
            subscription_id: sid,
            schedule_id: '',
            transaction_ts: iso(chargebackAt),
            transaction_type: 'chargeback',
            payment_processor: original.payment_processor,
            credit_or_debit: original.credit_or_debit,
            card_brand: original.card_brand,
            ...financial(0, 0, taxRateFor(zip), 0, -amount),
            refund_id: '',
            chargeback_id: '',
            update_ts: iso(chargebackAt)
          })
        }
      }
      let userSignupTs = firstPay;
      if (hasPriorSubscription) {
        const priorSid = subId(),
          priorLength = weightedPick([1, 3, 12], [.5, .333, .167]),
          priorPlan = PLAN[priorLength];
        subLookup.set(String(priorSid), {
          subscription_id: priorSid,
          user_id: uid,
          subscription_length: priorLength
        });
        const priorTrialStart = addDays(trialStart, -(priorPlan.days + 37)),
          priorStart = addDays(priorTrialStart, 7),
          priorFirstPay = new Date(priorStart),
          priorEnd = addDays(priorFirstPay, priorPlan.days);
        const priorDiscount = option('optDiscount') && chance(.45),
          priorAmount = priorDiscount ? round(priorPlan.price * .85) : priorPlan.price;
        const priorScheduleId = scheduleId(),
          priorTx = txId();
        userSignupTs = priorFirstPay;
        recordChange(uid, priorSid, 'trial', priorLength, 'status_change', priorTrialStart);
        recordChange(uid, priorSid, 'active', priorLength, 'status_change', priorFirstPay);
        recordChange(uid, priorSid, 'cancelled', priorLength, 'status_change', priorEnd, 'user');
        addSchedule({
          scheduled_payment_id: priorScheduleId,
          user_id: uid,
          subscription_id: priorSid,
          transaction_id: priorTx,
          renewal_number: 1,
          scheduled_payment_ts: iso(priorStart),
          transaction_ts: iso(priorFirstPay),
          gross_amount: money(priorPlan.price),
          discount_amount: money(priorPlan.price - priorAmount),
          scheduled_amount: money(priorAmount),
          tax_amount: money(taxFor(priorAmount, taxRateFor(zip))),
          declined_transactions: 0,
          payment_status: 'paid',
          update_ts: iso(now)
        });
        txs.push({
          transaction_id: priorTx,
          user_id: uid,
          subscription_id: priorSid,
          schedule_id: priorScheduleId,
          transaction_ts: iso(priorFirstPay),
          transaction_type: 'new_subscription',
          payment_processor: weightedPick(['stripe', 'apple_pay', 'google_pay'], [.68, .20,
            .12
          ]),
          credit_or_debit: weightedPick(['credit_card', 'debit_card'], [.72, .28]),
          card_brand: weightedPick(['visa', 'mastercard', 'american_express'], [.48, .32,
            .20
          ]),
          ...financial(priorPlan.price, priorPlan.price - priorAmount, taxRateFor(zip)),
          refund_id: '',
          chargeback_id: '',
          update_ts: iso(now)
        });
        subs.push({
          subscription_id: priorSid,
          user_id: uid,
          subscription_length: priorLength,
          trial_start_ts: iso(priorTrialStart),
          subscription_start_ts: iso(priorStart),
          subscription_end_ts: iso(priorEnd),
          subscription_type: 'new_subscription',
          subscription_status: 'cancelled',
          cancel_status: 'user',
          ...subscriptionTotals(priorSid, userTransactionStart, userFailedStart),
          last_update_ts: iso(now)
        });
        subLookup.set(String(priorSid), subs[subs.length - 1]);
      }
      subs.push({
        subscription_id: sid,
        user_id: uid,
        subscription_length: currentLength,
        trial_start_ts: iso(trialStart),
        subscription_start_ts: iso(start),
        subscription_end_ts: endTs,
        subscription_type: hasPriorSubscription ? 'reactivation' : 'new_subscription',
        subscription_status: status,
        cancel_status: cancelStatus || '',
        ...subscriptionTotals(sid, userTransactionStart, userFailedStart),
        last_update_ts: iso(now)
      });
      subLookup.set(String(sid), subs[subs.length - 1]);
      users[users.length - 1].signup_ts = iso(userSignupTs);
      users[users.length - 1].update_ts = iso(userSignupTs);
    }
    return {
      user_records: users,
      subscription_records: subs,
      subscription_change_records: changes,
      scheduled_subscription_payment_records: schedules,
      transaction_records: txs,
      failed_transactions: failed,
      metrics
    };
  }

  // Dataset previews, validation, and CSV exports
  function csvEscape(v) {
    let s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }

  function serializeRows(rows, cols) {
    return rows.map(r => cols.map(k => csvEscape(r[k])).join(',')).join('\r\n')
  }

  function createDataset(keepCsv, keepJson) {
    const out = {};
    for (const [key] of TABLES) out[key] = {
      columns: null,
      parts: keepCsv ? [] : null,
      count: 0,
      preview: [],
      jsonRows: keepJson ? [] : null
    };
    return out
  }

  function appendRows(dataset, key, rows, keepJson) {
    if (!rows.length) return;
    const m = dataset[key];
    if (!m.columns) {
      m.columns = COLUMNS[key];
      if (m.parts) m.parts.push(m.columns.join(','))
    }
    m.count += rows.length;
    if (m.preview.length < 50) m.preview.push(...rows.slice(0, 50 - m.preview.length));
    if (m.parts) m.parts.push(serializeRows(rows, m.columns));
    if (keepJson) m.jsonRows.push(...rows)
  }

  function auditGeneratedBatch(data) {
    const users = new Set(data.user_records.map(row => String(row.user_id))),
      subs = new Map(data.subscription_records.map(row => [String(row.subscription_id), row])),
      schedules = new Map(data.scheduled_subscription_payment_records.map(row => [String(row
        .scheduled_payment_id), row])),
      txIds = new Set(data.transaction_records.map(row => String(row.transaction_id))),
      totals = new Map();
    for (const row of data.subscription_records)
      if (!users.has(String(row.user_id))) generationWarnings.add(
        'A subscription references a missing user.');
    for (const row of data.transaction_records) {
      const sid = String(row.subscription_id);
      if (!users.has(String(row.user_id)) || !subs.has(sid)) generationWarnings.add(
        'A transaction references a missing user or subscription.');
      if (row.schedule_id && !schedules.has(String(row.schedule_id))) generationWarnings.add(
        'A transaction references a missing scheduled payment.');
      if (row.refund_id && !txIds.has(String(row.refund_id))) generationWarnings.add(
        'A refund link is missing its transaction.');
      if (row.chargeback_id && !txIds.has(String(row.chargeback_id))) generationWarnings.add(
        'A chargeback link is missing its transaction.');
      const total = totals.get(sid) || {
        gross: 0,
        net: 0
      };
      if (['new_subscription', 'renewal', 'upgrade_charge', 'one_time_purchase'].includes(row
          .transaction_type)) total.gross += Number(row.gross_amount || 0);
      total.net += Number(row.net_amount || 0);
      totals.set(sid, total)
    }
    for (const row of data.scheduled_subscription_payment_records) {
      if (!users.has(String(row.user_id)) || !subs.has(String(row.subscription_id)))
        generationWarnings.add('A scheduled payment references a missing user or subscription.');
      if (row.transaction_id && !txIds.has(String(row.transaction_id))) generationWarnings.add(
        'A scheduled payment references a missing captured transaction.');
      const sub = subs.get(String(row.subscription_id));
      if (sub?.subscription_status === 'cancelled' && sub.subscription_end_ts && new Date(row
          .scheduled_payment_ts) > new Date(sub.subscription_end_ts)) generationWarnings.add(
        'A cancelled subscription retains a scheduled payment after its end date.')
    }
    for (const [sid, sub] of subs) {
      const total = totals.get(sid) || {
        gross: 0,
        net: 0
      };
      if (Math.abs(round(total.gross) - Number(sub.gross_revenue || 0)) > .011 || Math.abs(round(
          total.net) - Number(sub.net_revenue || 0)) > .011) generationWarnings.add(
        'Subscription revenue totals do not reconcile to their transactions.')
    }
  }

  function updateGenerationEstimate(processed, target, batchRows, rowCounts = null) {
    const pct = target ? Math.min(100, Math.round(processed / target * 100)) : 0,
      bar = $('generationProgress'),
      label = $('generationEstimate');
    if (bar) bar.value = pct;
    if (!label) return;
    const ratio = target / Math.max(1, processed),
      rowCount = rowCounts ? Object.values(rowCounts).reduce((sum, count) => sum + count, 0) :
      Object.values(batchRows).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length :
        0), 0),
      bytes = Object.entries(batchRows).reduce((sum, [key, rows]) => sum + (Array.isArray(rows) &&
        rows.length ? JSON.stringify(rows).length * (rowCounts ? (rowCounts[key] || 0) / rows
          .length : 1) : 0), 0);
    label.textContent =
      `${pct}% · about ${Math.round(rowCount*ratio).toLocaleString()} journey rows · ${(bytes*ratio/1024/1024).toFixed(0)} MB raw JSON estimate`
  }

  function render() {
    const name = $('tableSelect').value;
    const meta = tables?.[name];
    const rows = meta?.preview || [];
    if (!meta || !meta.count) {
      $('preview').innerHTML =
        '<div class="empty"><b>No records</b>This table has no rows in this generated dataset.</div>';
      $('rowCount').textContent = '0 rows';
      return
    }
    const cols = meta.columns,
      shown = rows;
    let html = '<table class="data-table"><thead><tr>' + cols.map(c => '<th>' + c + '</th>').join(
      '') + '</tr></thead><tbody>';
    html += shown.map(r => '<tr>' + cols.map(c => '<td>' + String(r[c] ?? '').replace(/&/g,
      '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td>').join('') + '</tr>').join(
      '') + '</tbody></table>';
    $('preview').innerHTML = html;
    $('rowCount').textContent = `Showing ${shown.length} of ${meta.count.toLocaleString()} rows`;
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {
      type
    }));
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  async function streamCsv(key, destination = null) {
    if (!window.showSaveFilePicker) {
      toast('Large CSV export requires a browser with streamed file saving.');
      return
    }
    const state = appState;
    let writable = null;
    $('downloadCsv').disabled = true;
    $('tableSelect').disabled = true;
    $('summaryText').textContent = `Choose where to save ${key}.csv…`;
    try {
      const handle = destination || await window.showSaveFilePicker({
        suggestedName: key + '.csv',
        types: [{
          description: 'CSV file',
          accept: {
            'text/csv': ['.csv']
          }
        }]
      });
      writable = await handle.createWritable();
      await writable.write(COLUMNS[key].join(',') + '\r\n');
      generationOptions = state.options;
      if (key === 'marketing_records') {
        rng = seeded((state.masterSeed ^ 0x4d41524b) >>> 0);
        const market = makeMarketing(state.now, state.campaign);
        await writable.write(serializeRows(market.rows, COLUMNS[key]) + '\r\n');
      } else {
        const total = Math.ceil(state.count / state.batchSize);
        for (let batch = 0; batch < total; batch++) {
          rng = seeded((state.masterSeed + ((batch + 1) * 7919)) >>> 0);
          const size = Math.min(state.batchSize, state.count - batch * state.batchSize);
          const data = generate(size, state.hist, batch * state.batchSize, state.campaign, state
            .now)[key];
          if (data.length) await writable.write(serializeRows(data, COLUMNS[key]) + '\r\n');
          if (batch % 8 === 0) {
            $('summaryText').textContent = `Writing ${key}.csv · batch ${batch+1} of ${total}.`;
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
      }
      await writable.close();
      writable = null;
      $('summaryText').textContent =
        `Saved ${key}.csv. Generate another table export when ready.`;
      toast('CSV saved.');
    } catch (e) {
      if (writable) await writable.abort();
      if (e.name === 'AbortError') {
        $('summaryText').textContent = 'CSV export cancelled.'
      } else {
        console.error(e);
        toast('CSV export failed.')
      }
    } finally {
      generationOptions = null;
      $('downloadCsv').disabled = false;
      $('tableSelect').disabled = false
    }
  }

  const studioPerformance = {
    generation: null,
    reports: [],
    refreshAll: null,
    workerBatches: 0,
    sharedBatches: 0,
    aggregateCacheHits: 0
  };
  const reportAggregateCache = new Map();
  let sharedReportSession = null,
    generationWorker = null,
    generationWorkerDisabled = false,
    workerRequestId = 0;
  const workerRequests = new Map();

  // Background generation and report-processing caches
  function getGenerationWorker() {
    if (generationWorkerDisabled || typeof Worker === 'undefined') return null;
    if (generationWorker) return generationWorker;
    try {
      const constants = {
        PLAN,
        SOURCES,
        FAIL_ERRORS,
        MARKETING_NAMES,
        PEOPLE,
        PLACES,
        SOURCE_WEIGHTS,
        PLACE_WEIGHTS,
        PERSON_WEIGHTS,
        TAX_RATES
      };
      const functions = {
        seeded,
        rand,
        pick,
        chance,
        weightedPick,
        taxRateFor,
        round,
        money,
        taxFor,
        financial,
        iso,
        day,
        addDays,
        addCalendarMonths,
        remainingFullMonths,
        idFactory,
        randDate,
        randEmail,
        generate,
        auditGeneratedBatch
      };
      const source =
        'let rng=Math.random,generationOptions=null,generationWarnings=new Set();const option=id=>generationOptions[id];' +
        Object.entries(constants).map(([name, value]) => 'const ' + name + '=' + JSON.stringify(
          value) + ';').join('') + Object.entries(functions).map(([name, value]) => 'const ' +
          name + '=' + value.toString() + ';').join('') +
        `onmessage=event=>{const {id,state,batch,mode,includeSchedules}=event.data;try{const started=performance.now();generationOptions=state.options;generationWarnings=new Set();rng=seeded((state.masterSeed+((batch+1)*7919))>>>0);const size=Math.min(state.batchSize,state.count-batch*state.batchSize),scheduleEvents=[];const data=generate(size,state.hist,batch*state.batchSize,state.campaign,new Date(state.now),mode==='report',includeSchedules?(row,user,sub)=>scheduleEvents.push([row,user?{...user}:null,sub?{...sub}:null]):null);if(mode==='report'&&state.factTables)for(const key of ['transaction_records','subscription_change_records','failed_transactions'])if(!state.factTables.includes(key))data[key]=[];if(mode==='generator')auditGeneratedBatch(data);let rowCounts=null,dimensionValues=null;if(mode==='generator'&&state.count>5000){rowCounts={};dimensionValues={};for(const key of ['state','city','zipcode','campaign_source','campaign_name'])dimensionValues[key]=[...new Set(data.user_records.map(row=>String(row[key])))];dimensionValues.subscription_length=[...new Set(data.subscription_records.map(row=>row.subscription_length+' month'+(Number(row.subscription_length)===1?'':'s')))];for(const [key,rows]of Object.entries(data))if(Array.isArray(rows)){rowCounts[key]=rows.length;data[key]=batch===0?rows.slice(0,50):[]}}postMessage({id,result:{data,scheduleEvents,rowCounts,dimensionValues,warnings:[...generationWarnings],computeMs:performance.now()-started}})}catch(error){postMessage({id,error:error.message||String(error)})}};`;
      const url = URL.createObjectURL(new Blob([source], {
        type: 'text/javascript'
      }));
      generationWorker = new Worker(url);
      URL.revokeObjectURL(url);
      generationWorker.onmessage = event => {
        const pending = workerRequests.get(event.data.id);
        if (!pending) return;
        workerRequests.delete(event.data.id);
        event.data.error ? pending.reject(new Error(event.data.error)) : pending.resolve(event
          .data.result)
      };
      generationWorker.onerror = () => {
        generationWorkerDisabled = true;
        generationWorker?.terminate();
        generationWorker = null;
        for (const pending of workerRequests.values()) pending.reject(new Error(
          'Background worker unavailable'));
        workerRequests.clear()
      };
      return generationWorker;
    } catch (error) {
      generationWorkerDisabled = true;
      return null
    }
  }
  async function generateStudioBatch(state, batch, mode, includeSchedules = false, factTables =
    null) {
    const worker = getGenerationWorker();
    if (worker) {
      try {
        const id = ++workerRequestId,
          result = await new Promise((resolve, reject) => {
            workerRequests.set(id, {
              resolve,
              reject
            });
            worker.postMessage({
              id,
              state: {
                count: state.count,
                hist: state.hist,
                batchSize: state.batchSize,
                masterSeed: state.masterSeed,
                now: state.now,
                campaign: state.campaign,
                options: state.options,
                factTables: factTables ? [...factTables] : null
              },
              batch,
              mode,
              includeSchedules
            })
          });
        studioPerformance.workerBatches++;
        return result
      } catch (error) {
        generationWorkerDisabled = true;
        generationWorker?.terminate();
        generationWorker = null;
        for (const pending of workerRequests.values()) pending.reject(error);
        workerRequests.clear();
        console.warn('Using local generation after worker failure:', error)
      }
    }
    const previousOptions = generationOptions,
      previousRng = rng;
    try {
      generationOptions = state.options;
      rng = seeded((state.masterSeed + ((batch + 1) * 7919)) >>> 0);
      const scheduleEvents = [],
        started = performance.now(),
        data = generate(Math.min(state.batchSize, state.count - batch * state.batchSize), state
          .hist, batch * state.batchSize, state.campaign, state.now, mode === 'report',
          includeSchedules ? (row, user, sub) => scheduleEvents.push([row, user ? {
            ...user
          } : null, sub ? {
            ...sub
          } : null]) : null);
      return {
        data,
        scheduleEvents,
        warnings: null,
        computeMs: performance.now() - started
      }
    } finally {
      generationOptions = previousOptions;
      rng = previousRng
    }
  }

  let reportAggregationWorker = null,
    reportAggregationWorkerDisabled = false,
    aggregationRequestNumber = 0;
  const aggregationRequests = new Map();

  function createAggregationRuntime(spec, eventSource) {
    const {
      config,
      current,
      grain,
      axis,
      dateAxis,
      visibleCategoryDims,
      seriesDims,
      facetDims,
      moduleFilters,
      preparedDateFilters,
      requiredMetrics,
      periods
    } = spec;
    const requiredFactTables = new Set(spec.requiredFactTables),
      requiredMetricSpecs = new Map(spec.requiredMetricSpecs),
      buckets = new Map(),
      totals = new Map(periods.map(period => [period.id, createReportBucket()])),
      reportedFormulaErrors = new Map(),
      sampleRecords = [],
      inspection = spec.inspection;
    const inRange = (date, range) => {
      if (!date) return false;
      const key = localDateKey(date);
      return key >= localDateKey(range.start) && key <= localDateKey(range.end)
    };
    const bucketIndex = (date, range) => reportDateBucketIndex(date, range, grain);
    const calculateEvent = eval('(' + eventSource + ')');
    return {
      spec,
      push(events) {
        const started = performance.now();
        for (const event of events) {
          const before = inspection.accepted;
          calculateEvent(...event);
          if (sampleRecords.length < 200 && inspection.accepted > before) sampleRecords.push(
            event[4]);
        }
        return performance.now() - started
      },
      result() {
        for (const total of totals.values()) delete total.__uniqueRecordIds;
        return {
          buckets,
          totals,
          reportedFormulaErrors,
          sampleRecords,
          inspection
        }
      }
    };
  }

  function getReportAggregationWorker() {
    if (reportAggregationWorkerDisabled || typeof Worker === 'undefined') return null;
    if (reportAggregationWorker) return reportAggregationWorker;
    try {
      const functions = {
        createAggregationRuntime,
        createReportBucket,
        createMetricAggregate,
        accumulateMetricValue,
        addUniqueReportRecord,
        pad2,
        reportDate,
        addLocalDays,
        parseDateInput,
        localDateKey,
        startOfLocalDay,
        startOfWeek,
        reportDateBucketStart,
        reportDateBucketIndex,
        rawField,
        fieldType,
        dateDimensionFallback,
        dimensionValue,
        dimensionDisplayValue,
        matchesFilter,
        metricRowValue,
        evaluateFormula,
        evaluateExpression,
        lookmlIdentifier,
        caseKeywordPositions,
        expandCase,
        expressionDate,
        expressionDateKey,
        sqlDateDiff,
        maskSqlStringLiterals,
        sqlValueExpression,
        restoreSqlStringLiterals,
        splitSqlValueList,
        rewriteSqlPredicates,
        sqlIn,
        sqlNotIn,
        sqlBetween,
        sqlLike
      };
      const source =
        `const ReportingTools=(${createReportingTools.toString()})();let customMetrics=[],customAttributes=[];const $=()=>null;const REPORT_METRICS={};const expressionFunctionCache=new Map(),expressionPreparationCache=new Map();const COLUMNS=${JSON.stringify(COLUMNS)},NUMERIC_FIELDS=new Set(${JSON.stringify([...NUMERIC_FIELDS])}),DATE_FIELDS=new Set(${JSON.stringify([...DATE_FIELDS])});` +
        Object.entries(functions).map(([name, fn]) => 'const ' + name + '=' + fn.toString() + ';')
        .join('') + 'const SQL_FUNCTIONS={' + Object.entries(SQL_FUNCTIONS).map(([name, fn]) =>
          JSON.stringify(name) + ':(' + fn.toString() + ')').join(',') + '};' +
        `const jobs=new Map();onmessage=event=>{const {id,operation,payload}=event.data;try{let result;if(operation==='open'){customMetrics=payload.spec.customMetrics;customAttributes=payload.spec.customAttributes;jobs.set(payload.job,createAggregationRuntime(payload.spec,payload.source));result={job:payload.job}}else if(operation==='cancel'){jobs.delete(payload.job);result={}}else{const job=jobs.get(payload.job);if(!job)throw Error('Calculation job no longer exists');customMetrics=job.spec.customMetrics;customAttributes=job.spec.customAttributes;const computeMs=job.push(payload.events||[]);result=payload.final?{...job.result(),computeMs}:{computeMs};if(payload.final)jobs.delete(payload.job)}postMessage({id,result})}catch(error){if(payload?.job)jobs.delete(payload.job);postMessage({id,error:error.message||String(error)})}};`;
      const url = URL.createObjectURL(new Blob([source], {
        type: 'text/javascript'
      }));
      reportAggregationWorker = new Worker(url);
      URL.revokeObjectURL(url);
      reportAggregationWorker.onmessage = event => {
        const pending = aggregationRequests.get(event.data.id);
        if (!pending) return;
        aggregationRequests.delete(event.data.id);
        event.data.error ? pending.reject(new Error(event.data.error)) : pending.resolve(event
          .data.result)
      };
      reportAggregationWorker.onerror = () => {
        reportAggregationWorkerDisabled = true;
        reportAggregationWorker?.terminate();
        reportAggregationWorker = null;
        for (const pending of aggregationRequests.values()) pending.reject(new Error(
          'Background calculation worker failed; use Recalculate to retry locally.'));
        aggregationRequests.clear()
      };
      return reportAggregationWorker;
    } catch (error) {
      reportAggregationWorkerDisabled = true;
      return null
    }
  }

  function aggregationRequest(operation, payload) {
    const worker = getReportAggregationWorker();
    if (!worker) return Promise.resolve(null);
    const id = ++aggregationRequestNumber;
    return new Promise((resolve, reject) => {
      aggregationRequests.set(id, {
        resolve,
        reject
      });
      try {
        worker.postMessage({
          id,
          operation,
          payload
        })
      } catch (error) {
        aggregationRequests.delete(id);
        reject(error)
      }
    });
  }

  function reportBatch(state, batch, needsSchedule, factTables) {
    const session = sharedReportSession;
    if (!session || session.runId !== state.runId) return generateStudioBatch(state, batch,
      'report', needsSchedule, factTables);
    if (session.batches.has(batch)) return session.batches.get(batch);
    studioPerformance.sharedBatches++;
    const pending = generateStudioBatch(state, batch, 'report', session.needsSchedules, session
      .factTables);
    session.batches.set(batch, pending);
    while (session.batches.size > 4) session.batches.delete(session.batches.keys().next().value);
    return pending
  }

  const reportDisplaySnapshots = new Map();
  const reportDisplayOverrides = new Map();
  const dateDrillRequests = new Map();

  function aggregateCacheKey(config) {
    return JSON.stringify({
      uniqueRecordTotalsVersion: 1,
      run: appState.runId,
      revision: definitionRevision,
      today: localDateKey(new Date()),
      x: config.xFields?.map(({
        kind,
        id
      }) => ({
        kind,
        id
      })),
      y: config.yFields?.map(({
        kind,
        id
      }) => ({
        kind,
        id
      })),
      metrics: config.metrics,
      parameters: config.resolvedParameters,
      comparison: [config.compare, config.baselineStart, config.baselineEnd],
      filters: config.filters,
      date: config.dateRange,
      dateFields: config.dateFilterDimensions,
      independentDates: config.dateFilters,
      grain: config.chartType === 'calendar_heatmap' ? 'day' : config.dateDrillLevel || config
        .grain,
      dateFocus: config.dateDrillFocus,
      threshold: config.thresholdEnabled ? config.thresholdMetric : null
    })
  }

  function retainReportAggregates(key, value) {
    if (value.buckets.size > 25000) return;
    reportAggregateCache.delete(key);
    reportAggregateCache.set(key, value);
    while (reportAggregateCache.size > 12 || [...reportAggregateCache.values()].reduce((sum,
        item) => sum + item.buckets.size, 0) > 75000) reportAggregateCache.delete(
      reportAggregateCache.keys().next().value)
  }

  function make(savedRun = null) {
    const count = Math.max(1, Math.min(500000, parseInt(savedRun?.count ?? ($('userCount')
      .value || '1'), 10)));
    $('userCount').value = count;
    const masterSeed = savedRun?.masterSeed != null ? Number(savedRun.masterSeed) >>> 0 : ($(
      'seed').value ? Number($('seed').value) >>> 0 : Math.floor(Math.random() * 4294967295));
    $('seed').value = masterSeed;
    const hist = Math.min(3650, parseInt(savedRun?.hist ?? $('historyDays').value, 10)),
      now = savedRun?.now ? new Date(savedRun.now) : new Date(),
      batchSize = 250,
      totalBatches = Math.ceil(count / batchSize);
    const options = {
      optDiscount: $('optDiscount').checked,
      optFailures: $('optFailures').checked,
      optChanges: $('optChanges').checked,
      optCancels: $('optCancels').checked,
      optOneTime: $('optOneTime').checked,
      optChargebacks: $('optChargebacks').checked,
      distributionMode: $('distributionMode')?.value || 'weighted',
      ...(savedRun?.options || {})
    };
    for (const key of Object.keys(options))
      if ($(key)) $(key).checked = !!options[key];
    if ($('distributionMode')) $('distributionMode').value = options.distributionMode;
    const keepCsv = count <= 5000,
      keepJson = count <= 1000,
      totals = {
        upgrades: 0,
        downgrades: 0,
        oneTime: 0,
        failedPayments: 0,
        refunds: 0,
        chargebacks: 0
      };
    tables = createDataset(keepCsv, keepJson);
    dimensionValueCache = {};
    generationWarnings = new Set();
    generationCancelRequested = false;
    generationOptions = options;
    $('generate').disabled = true;
    $('cancelGeneration').disabled = false;
    $('generationProgressWrap').hidden = false;
    $('generationProgress').value = 0;
    $('downloadCsv').disabled = true;
    $('downloadJson').disabled = true;
    $('tableSelect').disabled = true;
    $('generate').textContent = 'Preparing…';
    $('summaryText').textContent = 'Preparing campaign history…';
    rng = seeded(masterSeed);
    const campaign = savedRun?.campaign || makeCampaignNames();
    appState = {
      count,
      hist,
      masterSeed,
      now,
      campaign,
      options,
      batchSize,
      runId: ++generationRunCounter,
      marketingRows: null
    };
    for (const sheet of reportSheets)
      for (const widget of sheet.widgets || []) {
        if (widget.kind === 'placeholder') continue;
        widget.needsRefresh = true;
        widget.lastRunId = null
      }
    rng = seeded((masterSeed ^ 0x4d41524b) >>> 0);
    const marketing = makeMarketing(now, campaign);
    appState.marketingRows = marketing.rows;
    appendRows(tables, 'marketing_records', marketing.rows, keepJson);
    let batch = 0;
    const generationStarted = performance.now(),
      generationRun = appState.runId;
    reportAggregateCache.clear();
    reportDisplaySnapshots.clear();
    reportDisplayOverrides.clear();
    for (const [id, token] of reportRunTokens) reportRunTokens.set(id, token + 1);
    const runBatch = async () => {
      try {
        const size = Math.min(batchSize, count - batch * batchSize);
        rng = seeded((masterSeed + ((batch + 1) * 7919)) >>> 0);
        const batchResult = await generateStudioBatch(appState, batch, 'generator');
        if (appState.runId !== generationRun) return;
        const generated = batchResult.data;
        if (batchResult.warnings) batchResult.warnings.forEach(warning => generationWarnings
          .add(warning));
        else auditGeneratedBatch(generated);
        cacheGeneratedDimensionValues(generated);
        if (batchResult.dimensionValues)
          for (const [id, values] of Object.entries(batchResult.dimensionValues)) values
            .forEach(value => cacheDimensionValue(id, value));
        for (const [key] of TABLES) {
          if (key !== 'marketing_records') {
            const previousCount = tables[key].count;
            appendRows(tables, key, generated[key], keepJson);
            if (batchResult.rowCounts) {
              tables[key].count = previousCount + (batchResult.rowCounts[key] || 0);
              if (tables[key].count && !tables[key].columns) tables[key].columns = COLUMNS[
                key]
            }
          }
        }
        totals.upgrades += generated.metrics.upgrades;
        totals.downgrades += generated.metrics.downgrades;
        totals.oneTime += generated.metrics.oneTime;
        totals.failedPayments += generated.metrics.failedPayments;
        totals.refunds += generated.metrics.refunds;
        totals.chargebacks += generated.metrics.chargebacks;
        batch++;
        const processed = tables.user_records.count;
        if (batch === 1 || (!batchResult.rowCounts && (batch % 10 === 0 || batch ===
            totalBatches))) updateGenerationEstimate(processed, count, generated, batchResult
          .rowCounts);
        else if (batchResult.rowCounts) {
          const pct = Math.round(processed / count * 100);
          $('generationProgress').value = pct;
          $('generationEstimate').textContent = $('generationEstimate').textContent.replace(
            /^\d+%/, pct + '%')
        }
        $('generate').textContent =
          `Generating ${processed.toLocaleString()} / ${count.toLocaleString()}…`;
        $('summaryText').textContent =
          `Generating batch ${batch.toLocaleString()} of ${totalBatches.toLocaleString()} · ${processed.toLocaleString()} users.`;
        if (batch < totalBatches && !generationCancelRequested) {
          setTimeout(runBatch, 0);
          return
        }
        const selects = TABLES.map(([k, label]) =>
            `<option value="${k}">${label} · ${tables[k].count.toLocaleString()}</option>`)
          .join('');
        $('tableSelect').innerHTML = selects;
        $('tableSelect').disabled = false;
        $('downloadCsv').disabled = false;
        $('downloadJson').disabled = !keepJson;
        $('exportOptions').innerHTML = TABLES.map(([k, label]) =>
          `<label><input type="checkbox" value="${k}" checked> ${label} · ${tables[k].count.toLocaleString()}</label>`
        ).join('');
        updateExportSelection();
        $('statUsers').textContent = tables.user_records.count.toLocaleString();
        $('statSubs').textContent = tables.subscription_records.count.toLocaleString();
        $('statTx').textContent = tables.transaction_records.count.toLocaleString();
        $('statSchedules').textContent = tables.scheduled_subscription_payment_records.count
          .toLocaleString();
        $('totalUpgrades').textContent = totals.upgrades.toLocaleString();
        $('totalDowngrades').textContent = totals.downgrades.toLocaleString();
        $('totalOneTime').textContent = totals.oneTime.toLocaleString();
        $('totalFailed').textContent = totals.failedPayments.toLocaleString();
        $('totalRefunds').textContent = totals.refunds.toLocaleString();
        $('totalChargebacks').textContent = totals.chargebacks.toLocaleString();
        const completed = tables.user_records.count;
        appState.count = completed;
        const cancelled = generationCancelRequested;
        $('summaryText').textContent =
          `${cancelled?'Stopped early. Generated':'Generated'} ${completed.toLocaleString()} linked journeys. CSVs for runs over 5,000 users are regenerated and streamed by table; JSON is available up to 1,000 users.`;
        $('qualitySummary').textContent = generationWarnings.size ?
          `Integrity check warnings: ${[...generationWarnings].join(' ')}` :
          'Integrity checks passed: table links and subscription revenue totals reconcile.';
        studioPerformance.generation = {
          users: completed,
          historyDays: hist,
          elapsedMs: performance.now() - generationStarted,
          worker: !generationWorkerDisabled
        };
        $('summaryText').textContent +=
          ` Generation: ${(studioPerformance.generation.elapsedMs/1000).toFixed(2)} s.`;
        generationOptions = null;
        persistLastRun();
        render();
        renderDictionary();
        evaluateDictionaryPreview();
        toast(cancelled ? 'Generation cancelled; completed rows are available.' :
          'Synthetic data generated.');
        if (completed > 1000) $('downloadJson').title =
          'JSON download is enabled for runs up to 1,000 users.';
      } catch (e) {
        console.error(e);
        batch = totalBatches;
        generationOptions = null;
        $('summaryText').textContent =
          'Generation stopped because of an error. The completed batches remain available.';
        $('qualitySummary').textContent = e.message || String(e);
        toast('Generation stopped. Check the error details.')
      } finally {
        if (batch >= totalBatches || generationCancelRequested) {
          $('generate').disabled = false;
          $('generate').textContent = 'Generate synthetic data';
          $('cancelGeneration').disabled = true;
          $('generationProgressWrap').hidden = true;
          $('tableSelect').disabled = false;
          updateExportSelection()
        }
      }
    };
    setTimeout(runBatch, 20);
  }

  function persistLastRun() {
    try {
      if (!appState) return;
      localStorage.setItem('syntheticGeneratorLastRun', JSON.stringify({
        count: appState.count,
        hist: appState.hist,
        masterSeed: appState.masterSeed,
        now: appState.now instanceof Date ? appState.now.toISOString() : appState.now,
        campaign: appState.campaign,
        options: appState.options
      }));
      document.cookie =
        `sds_instance_id=${encodeURIComponent(localStorage.getItem('syntheticGeneratorInstanceId')||'local')}; path=/; max-age=31536000; SameSite=Lax`
    } catch (error) {
      console.warn('Could not autosave the generated journey recipe', error)
    }
  }
  // Reporting date utilities, dictionary fields, and SQL expressions
  const REPORT_DIMS = {};
  const DATE_FIELDS = new Set(Object.values(COLUMNS).flat().filter(c => c === 'date' || c ===
    'dob' || c.endsWith('_ts')));
  const NUMERIC_FIELDS = new Set(['views', 'views_est', 'clicks', 'visits', 'visits_est', 'cost',
    'subscription_length', 'gross_revenue', 'net_revenue', 'total_discount', 'total_tax',
    'total_transactions', 'failed_transactions', 'refunds', 'chargebacks', 'renewal_number',
    'gross_amount', 'discount_amount', 'scheduled_amount', 'tax_amount',
    'declined_transactions', 'tax_rate', 'net_amount', 'refund_amount', 'chargeback_amount'
  ]);
  const RELATIONSHIPS = [
    ['user_records.user_id', 'subscription_records.user_id'],
    ['scheduled_subscription_payment_records.transaction_id',
      'transaction_records.transaction_id'
    ],
    ['subscription_records.subscription_id', 'transaction_records.subscription_id'],
    ['subscription_records.subscription_id', 'subscription_change_records.subscription_id'],
    ['subscription_records.subscription_id',
      'scheduled_subscription_payment_records.subscription_id'
    ],
    ['transaction_records.transaction_id',
      'scheduled_subscription_payment_records.transaction_id'
    ],
    ['transaction_records.transaction_id', 'failed_transactions.transaction_id'],
    ['marketing_records.campaign_source + campaign_name',
      'user_records.campaign_source + campaign_name'
    ]
  ];
  const REPORT_METRICS = {};
  const CHARGE_TYPES = new Set(['new_subscription', 'renewal', 'upgrade_charge',
    'one_time_purchase'
  ]);
  const pad2 = n => String(n).padStart(2, '0');

  function reportDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateInput(
      value);
    return new Date(value)
  }

  function localDateKey(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = reportDate(value);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
  }

  function parseDateInput(value) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d)
  }

  function addLocalDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x
  }

  function startOfLocalDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  function startOfWeek(d) {
    const x = startOfLocalDay(d),
      offset = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - offset);
    return x
  }

  function getReportRange(config) {
    const now = startOfLocalDay(new Date()),
      yesterday = addLocalDays(now, -1),
      period = config.period || 'ytd';
    let start, end = now;
    if (period === 'all_time') {
      start = new Date(1970, 0, 1)
    } else if (period === 'custom') {
      if (!config.start || !config.end) throw new Error(
        'Choose both dates for the custom range.');
      start = parseDateInput(config.start);
      end = parseDateInput(config.end)
    } else if (period === 'yesterday') {
      start = yesterday;
      end = yesterday
    } else if (period === 'this_week') {
      start = startOfWeek(now)
    } else if (period === 'last_week') {
      end = addLocalDays(startOfWeek(now), -1);
      start = addLocalDays(end, -6)
    } else if (period === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (period === 'last_7') {
      start = addLocalDays(now, -6)
    } else if (period === 'last_30') {
      start = addLocalDays(now, -29)
    } else if (period === 'last_90') {
      start = addLocalDays(now, -89)
    } else if (period === 'ytd') {
      start = new Date(now.getFullYear(), 0, 1)
    }
    if (localDateKey(end) < localDateKey(start)) throw new Error(
      'End date must be on or after start date.');
    return {
      start,
      end,
      label: `${localDateKey(start)} to ${localDateKey(end)}`,
      days: Math.floor((end - start) / 86400000) + 1
    };
  }

  function shiftYears(d, years) {
    const year = d.getFullYear() - years,
      month = d.getMonth(),
      day = Math.min(d.getDate(), new Date(year, month + 1, 0).getDate());
    return new Date(year, month, day)
  }

  function getComparisonRange(current, config) {
    if (config.compare === "custom") {
      const start = parseDateInput(config.baselineStart),
        end = parseDateInput(config.baselineEnd);
      if (!start || !end || start > end) throw Error("Choose a valid custom comparison range.");
      return {
        start,
        end,
        days: Math.floor((end - start) / 86400000) + 1,
        label: "Custom baseline"
      };
    }
    const value = config.compare;
    if (value === 'none') return null;
    if (value === 'previous') {
      const end = addLocalDays(current.start, -1),
        start = addLocalDays(end, -(current.days - 1));
      return {
        start,
        end,
        label: `${localDateKey(start)} to ${localDateKey(end)}`,
        days: current.days
      }
    }
    const years = Number(value),
      start = config.alignment === 'weekday' ? addLocalDays(current.start, -364 * years) :
      shiftYears(current.start, years),
      end = config.alignment === 'weekday' ? addLocalDays(current.end, -364 * years) : shiftYears(
        current.end, years);
    return {
      start,
      end,
      label: `${localDateKey(start)} to ${localDateKey(end)}`,
      days: Math.floor((end - start) / 86400000) + 1
    };
  }

  function createReportBucket() {
    return {
      gross: 0,
      net: 0,
      discount: 0,
      refund: 0,
      chargeback: 0,
      tax: 0,
      marketingSpend: 0,
      newUsers: 0,
      newSubscriptions: 0,
      upgrades: 0,
      downgrades: 0,
      reactivations: 0,
      failed: 0,
      transactions: 0,
      ltvTotal: 0,
      ltvUsers: 0,
      customAgg: {},
      recordContributions: new Map()
    }
  }

  function createMetricAggregate() {
    return {
      sum: 0,
      sumCorrection: 0,
      count: 0,
      min: Infinity,
      max: -Infinity,
      distinct: new Set(),
      values: [],
      frequency: new Map()
    };
  }

  function accumulateMetricValue(aggregate, value, aggregation) {
    if (value == null || (['count', 'count_distinct'].includes(aggregation) ? value === '' : !
        Number.isFinite(value))) return;
    if (aggregation === 'count_distinct') aggregate.distinct.add(String(value));
    else if (aggregation !== 'count') {
      const corrected = value - (aggregate.sumCorrection || 0),
        sum = aggregate.sum + corrected;
      aggregate.sumCorrection = (sum - aggregate.sum) - corrected;
      aggregate.sum = sum;
      aggregate.min = Math.min(aggregate.min, value);
      aggregate.max = Math.max(aggregate.max, value);
      if (aggregation === 'table_median') aggregate.values.push(value);
      if (aggregation === 'table_mode') aggregate.frequency.set(String(value), (aggregate
        .frequency.get(String(value)) || 0) + 1);
    }
    aggregate.count++;
  }

  function addUniqueReportRecord(target, fact, recordId, computed, metrics, isTotal = false) {
    const stores = isTotal ? (target.__uniqueRecordIds || (target.__uniqueRecordIds =
      new Map())) : target.recordContributions;
    if (!stores.has(fact)) stores.set(fact, isTotal ? new Set() : new Map());
    const records = stores.get(fact);
    if (records.has(recordId)) return false;
    if (isTotal) records.add(recordId);
    else records.set(recordId, computed);
    for (const metric of metrics) {
      const value = computed[metric.id];
      if (value == null) continue;
      const aggregate = target.customAgg[metric.id] || (target.customAgg[metric.id] =
        createMetricAggregate());
      accumulateMetricValue(aggregate, value, metric.aggregation);
    }
    return true;
  }

  function mergeReportAggregates(buckets) {
    buckets = [...new Set(buckets)];
    const merged = {
      customAgg: {},
      recordContributions: new Map(),
      __parameters: buckets[0]?.__parameters || {}
    };
    for (const bucket of buckets) {
      if (bucket.recordContributions?.size) {
        for (const [fact, records] of bucket.recordContributions) {
          if (!merged.recordContributions.has(fact)) merged.recordContributions.set(fact,
            new Map());
          const target = merged.recordContributions.get(fact);
          for (const [recordId, contributions] of records)
            if (!target.has(recordId)) target.set(recordId, contributions);
        }
      } else {
        // Compatibility for aggregate-only callers; live reports retain record identities.
        for (const [id, value] of Object.entries(bucket.customAgg || {})) {
          const target = merged.customAgg[id] || (merged.customAgg[id] = createMetricAggregate());
          target.sum += value.sum;
          target.count += value.count;
          target.min = Math.min(target.min, value.min);
          target.max = Math.max(target.max, value.max);
          for (const item of value.distinct || []) target.distinct.add(item);
          if (value.values?.length) target.values.push(...value.values);
          for (const [key, count] of value.frequency || []) target.frequency.set(key, (target
            .frequency.get(key) || 0) + count);
        }
      }
    }
    const metrics = new Map(customMetrics.map(metric => [metric.id, metric]));
    for (const records of merged.recordContributions.values())
      for (const contributions of records.values())
        for (const [id, value] of Object.entries(contributions)) {
          const metric = metrics.get(id);
          if (!metric) continue;
          const aggregate = merged.customAgg[id] || (merged.customAgg[id] =
            createMetricAggregate());
          accumulateMetricValue(aggregate, value, metric.aggregation);
        }
    merged.tableValues = {};
    const inputs = new Map();
    for (const bucket of buckets)
      for (const [id, value] of Object.entries(bucket.tableInputs || {})) {
        if (!inputs.has(id)) inputs.set(id, []);
        inputs.get(id).push(value);
      }
    for (const [id, values] of inputs) {
      const item = metrics.get(id);
      if (item) merged.tableValues[id] = item.tableMode === 'window' && !item.aggregation
        .startsWith('table_') ? null : item.aggregation === 'table_sum' ?
        reportMetricValue(item.tableBaseMetric, merged) :
        ReportingTools.statistic(values, item.aggregation);
    }
    return merged;
  }

  let definitionVersions = [];
  let lastSavedDefinitionSource = null;
  try {
    definitionVersions = JSON.parse(localStorage.getItem('studioDefinitionVersions') || '[]');
  } catch {}

  function validateReportPlan(config, metricIds) {
    normalizeDateFilters(config);
    const missingDates = (config.dateFilters || []).filter(filter => filter.enabled && !
      customAttributes.some(item => item.id === filter.dimension));
    const missingDimensions = (config.filters || []).filter(filter => filter.dimension && !
      customAttributes.some(item => item.id === filter.dimension));
    const errors = [
        ...missingDates.map(filter =>
          `Date filter "${filter.dimension}" is missing from the Data Dictionary. Replace or remove it in Module Setup → Dimension Filters → Date Filters.`
        ),
        ...missingDimensions.map(filter =>
          `Filter dimension "${filter.dimension}" is missing from the Data Dictionary. Replace or remove it in Module Setup → Dimension Filters.`
        )
      ],
      dimensionIds = [...(config.xFields || []), ...(config.yFields || [])].filter(field => field
        .kind === 'dimension').map(field => field.id).concat((config.filters || []).map(filter =>
        filter.dimension), (config.dateFilters || []).filter(filter => filter.role !==
        'event' && filter.enabled).map(filter => filter.dimension));
    for (const id of metricIds.flatMap(id => metricDependencyIds(id))) {
      const item = customMetrics.find(metric => metric.id === id);
      if (!item) continue;
      if (item.tableMode === 'window') {
        const axisIds = [...(config.xFields || []), ...(config.yFields || [])].filter(f => f
          .kind === 'dimension').map(f => f.id);
        for (const field of [...(item.tablePartitionFields || []), ...(item.tableOrderFields ||
          []).map(f => f.id)])
          if (!axisIds.includes(field)) errors.push(
            `${item.lookmlName}: add ${dimensionLabel(field)} to an axis so its calculation partition/order has an unambiguous cell grain.`
          );
      }
      const info = ReportingTools.lineage(item, customMetrics, customAttributes);
      errors.push(...info.errors.map(error => item.lookmlName + ': ' + error));
      if (!info.fact) continue;
      const available = ReportingTools.joins[info.fact] || [info.fact];
      for (const dimension of dimensionIds)
        for (const ref of dimensionFieldRefs(dimension))
          if (!available.includes(ref.split('.')[0])) errors.push(
            `${dimensionLabel(dimension)} cannot group/filter ${item.lookmlName} at ${info.grain} grain.`
          );
    }
    return [...new Set(errors)];
  }

  function affectedReportNames(names) {
    const changed = new Set(names),
      ids = new Set([...customAttributes, ...customMetrics].filter(item => changed.has(item
        .lookmlName)).map(item => item.id));
    return reportSheets.flatMap(sheet => (sheet.widgets || []).filter(widget => {
      const config = widget.config || {},
        fields = [...(config.xFields || []), ...(config.yFields || []), ...(config
          .filters || []).map(filter => ({
          kind: 'dimension',
          id: filter.dimension
        })), ...(config.dateFilters || []).filter(filter => filter.dimension).map(
          filter => ({
            kind: 'dimension',
            id: filter.dimension
          })), ...(config.thresholdMetric ? [{
          kind: 'metric',
          id: config.thresholdMetric
        }] : [])];
      return fields.some(field => {
        if (ids.has(field.id)) return true;
        const item = (field.kind === 'metric' ? customMetrics : customAttributes).find(
            value => value.id === field.id),
          dependencies = ReportingTools.dependencies(item, customMetrics,
            customAttributes);
        return [...dependencies.measures, ...dependencies.dimensions].some(id => ids
          .has(id))
      });
    }).map(widget => sheet.name + ' / ' + widget.name));
  }

  function previewDefinitionChanges() {
    const host = $('definitionVersionPreview');
    if (!host) return;
    try {
      const current = collectDefinitionSource(),
        previous = lastSavedDefinitionSource ?? serializeLookmlDefinitions(),
        differences = ReportingTools.definitionDiff(parseLookmlDefinitions(previous),
          parseLookmlDefinitions(current)),
        affected = affectedReportNames(differences.map(item => item.name));
      host.innerHTML = differences.length ? differences.map(item =>
          `<details><summary>${htmlEscape(item.action + ': ' + item.name)}</summary><div class="definition-diff"><div><b>Before</b><pre>${htmlEscape(item.before || '(new definition)')}</pre></div><div><b>After</b><pre>${htmlEscape(item.after || '(removed definition)')}</pre></div></div></details>`
        ).join('') +
        `<p>Affected reports: ${htmlEscape(affected.join(', ') || 'None currently placed on axes')}</p>` :
        '<p>No changes since the last saved definition source.</p>';
    } catch (error) {
      host.textContent = error.message;
    }
  }

  function stampDefinitionContracts(source, measures) {
    const blocks = parseLookmlDefinitions(source);
    let output = source;
    for (const block of [...blocks].reverse()) {
      if (block.kind !== 'measure') continue;
      const item = measures.find(value => value.lookmlName === block.id);
      if (!item) continue;
      const additions = [];
      if (item.percentScale && !block.props.percent_scale) additions.push('  percent_scale: ' +
        item.percentScale);
      if (item.tableMode) {
        for (const [property, value] of [
            ['table_mode', item.tableMode],
            ['table_scope', item.tableScope],
            ['table_partition', item.tablePartition],
            ['table_order', item.tableOrder]
          ])
          if (value && !block.props[property]) additions.push('  ' + property + ': ' + value)
      }
      if (additions.length) {
        const raw = block.raw.replace(/\}\s*$/, '\n' + additions.join('\n') + '\n}');
        output = output.slice(0, block.start) + raw + output.slice(block.end)
      }
    }
    return output;
  }

  function rememberDefinitionVersion(source) {
    if (lastSavedDefinitionSource === source) return;
    const previous = lastSavedDefinitionSource;
    if (previous && !definitionVersions.some(version => version.source === previous))
      definitionVersions.push({
        savedAt: new Date().toISOString(),
        source: previous
      });
    definitionVersions.push({
      savedAt: new Date().toISOString(),
      source
    });
    definitionVersions = definitionVersions.slice(-10);
    lastSavedDefinitionSource = source;
    try {
      localStorage.setItem('studioDefinitionVersions', JSON.stringify(definitionVersions));
    } catch {}
  }

  function renderReportingKnowledge() {
    const host = $('calculationLineage');
    if (!host) return;
    if (lastSavedDefinitionSource == null && $('definitionEditor')?.value)
      lastSavedDefinitionSource = $('definitionEditor').value;
    host.innerHTML =
      `<div class="knowledge-table-wrap"><table class="report-table"><caption>Saved measure lineage</caption><thead><tr><th scope="col">Measure</th><th scope="col">Source / grain</th><th scope="col">Aggregation</th><th scope="col">Dependencies</th><th scope="col">Contract</th></tr></thead><tbody>${customMetrics.map(item => {const info = ReportingTools.lineage(item,customMetrics,customAttributes);return `<tr><th scope="row">${htmlEscape(item.lookmlName)}</th><td>${htmlEscape((info.tables.join(', ') || 'Constant expression') + ' · ' + info.grain)}</td><td>${htmlEscape(info.aggregation)}</td><td>${htmlEscape([...info.measures.map(id=>metricMeta(id).label),...info.dimensions.map(dimensionLabel),...info.columns].join(', ') || 'None')}</td><td>${htmlEscape([item.format==='percent'?(item.percentScale==='fraction'?'Fraction: 0.10 = 10%':'Legacy points: 10 = 10%'):'Finite numeric / NULL',item.tableMode==='source'?'Legacy source statistic; add table_mode: window to migrate':'',...info.errors,...info.warnings].filter(Boolean).join(' · '))}</td></tr>`}).join('')}</tbody></table></div><p>Allowed row contexts: subscriptions → user; captured transactions / scheduled payments / changes / failures → subscription + user; marketing → marketing only. Cross-fact ratios combine separate aggregate measures.</p>`;
    $('reportingGlossary').innerHTML = ReportingTools.glossary.map(([term, description]) =>
        `<details><summary>${htmlEscape(term)}</summary><p>${htmlEscape(description)}</p></details>`
      ).join('') +
      '<p>Worked ratio: 1/2 and 1/8 combine to 2/10 = 20%, not the 31.25% simple average of group percentages. Weighted average = combined sum / combined count.</p>';
    const versions = $('definitionVersions');
    versions.innerHTML = definitionVersions.length ? definitionVersions.map((version, index) =>
        `<details><summary>Version ${index+1} · ${htmlEscape(new Date(version.savedAt).toLocaleString())}</summary><pre>${htmlEscape(version.source)}</pre></details>`
      ).join('') :
      '<p>Snapshots are recorded when definitions are saved. Preview Changes compares the editor with the last saved version.</p>';
  }

  function dictionaryFieldName(item, id, kind) {
    if (item?.lookmlName) return item.lookmlName;
    const value = String(item?.id || id || '');
    return value.replace(kind === 'metric' ? /^metric_/ : /^attr_/, '')
  }

  function metricMeta(id) {
    const item = customMetrics.find(m => m.id === id);
    return item ? {
      ...item,
      label: dictionaryFieldName(item, id, 'metric')
    } : {
      label: id,
      format: 'number'
    }
  }

  function fitMetricCardValue(card) {
    const value = card?.querySelector('strong'),
      label = card?.querySelector('span');
    if (!value || !label || !card.clientWidth || !card.clientHeight) return;
    const style = getComputedStyle(card);
    const width = card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style
      .paddingRight);
    const height = card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style
      .paddingBottom);
    const gap = parseFloat(style.rowGap) || 0;
    // Fit both label and value to the available width AND height after resizing.
    let low = 0.01,
      high = 1;
    for (let step = 0; step < 12; step++) {
      const scale = (low + high) / 2;
      value.style.fontSize = `${76 * scale}px`;
      label.style.fontSize = `${12 * scale}px`;
      const fits = value.scrollWidth <= width && label.scrollWidth <= width &&
        value.getBoundingClientRect().height + label.getBoundingClientRect().height + gap <=
        height;
      if (fits) low = scale;
      else high = scale;
    }
    value.style.fontSize = `${76 * low}px`;
    label.style.fontSize = `${12 * low}px`;
  }
  const metricCardFitObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(
    entries => entries.forEach(entry => fitMetricCardValue(entry.target))) : null;

  function reportMetricValue(id, b, stack = []) {
    const custom = customMetrics.find(m => m.id === id);
    if (!custom || stack.includes(id)) return null;
    if (custom.tableMode === 'window') {
      if (Object.prototype.hasOwnProperty.call(b.tableValues || {}, id)) return b.tableValues[id];
      return reportMetricValue(custom.tableBaseMetric, b, [...stack, id]);
    }
    if (custom.kind === 'base') return reportMetricValue(custom.base, b, [...stack, id]);
    if (custom.kind === 'ratio') {
      const numerator = reportMetricValue(custom.numerator, b, [...stack, id]),
        denominator = reportMetricValue(custom.denominator, b, [...stack, id]);
      if (numerator == null || denominator == null) return null;
      const ratio = ReportingTools.divide(numerator, denominator);
      return ratio == null ? null : ratio * (custom.asPercent && custom.percentScale !==
        'fraction' ? 100 : 1)
    }
    if (custom.formula && !/\[[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\]/.test(custom.formula) && !
      /\[dimension:/.test(custom.formula) && /\{\{/.test(custom.formula)) {
      const expression = custom.formula.replace(/\{\{([^}]+)\}\}/g, (_, name) => {
        const metric = customMetrics.find(x => x.id === name || x.lookmlName === name || x
          .label.toLowerCase() === name.trim().toLowerCase());
        if (!metric) throw new Error(`Unknown measure reference: ${name}`);
        const value = reportMetricValue(metric.id, b, [...stack, id]);
        return value == null ? 'NULL' : String(value)
      });
      return ReportingTools.numeric(evaluateExpression(expression, {
        __parameters: b.__parameters || {}
      }, [...stack, id]))
    }
    const aggregate = b.customAgg?.[id];
    if (!aggregate || !aggregate.count) return null;
    if (custom.aggregation === 'count_distinct') return aggregate.distinct?.size || 0;
    if (custom.aggregation === 'avg' || custom.aggregation === 'table_avg' || custom
      .aggregation === 'table_mean') return aggregate.sum / aggregate.count;
    if (custom.aggregation === 'min') return aggregate.min;
    if (custom.aggregation === 'max') return aggregate.max;
    if (custom.aggregation === 'count') return aggregate.count;
    if (custom.aggregation === 'table_median') {
      const values = [...(aggregate.values || [])].sort((a, b) => a - b),
        middle = Math.floor(values.length / 2);
      return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
    }
    if (custom.aggregation === 'table_mode') {
      const frequencies = aggregate.frequency || new Map();
      let maximum = 0;
      for (const count of frequencies.values())
        if (count > maximum) maximum = count;
      const modes = [...frequencies.entries()].filter(([, count]) => count === maximum).map(([
        value
      ]) => Number(value)).sort((a, b) => a - b);
      return modes.length ? modes[0] : null
    }
    if (custom.aggregation === 'table_sum') return aggregate.sum;
    return aggregate.sum;
  }

  // Window calculations operate on aggregate cells, partitioned independently of display order.
  // Build spans before transposing so horizontal and vertical spreadsheets share one layout.
  function renderSpreadsheetCells(matrix, rowKinds, transpose = false, threshold = null) {
    const spans = new Map(),
      hidden = new Set(),
      height = matrix.length,
      width = matrix[0]?.length || 0,
      key = (r, c) => r + ':' + c;
    for (let r = 0; r < height; r++)
      for (let c = 0; c < width; c++) {
        if (hidden.has(key(r, c))) continue;
        const cell = matrix[r][c];
        let rows = 1,
          cols = 1;
        if (cell.kind === 'column') {
          while (c + cols < width && matrix[r][c + cols].kind === 'column' && JSON.stringify(
              matrix[r][c + cols].prefix) === JSON.stringify(cell.prefix)) cols++;
        } else if (cell.kind === 'row') {
          while (r + rows < height && rowKinds[r + rows] === 'data' && matrix[r + rows][c]
            .kind === 'row' && JSON.stringify(matrix[r + rows][c].prefix) === JSON.stringify(cell
              .prefix)) rows++;
        }
        spans.set(key(r, c), [rows, cols]);
        for (let dr = 0; dr < rows; dr++)
          for (let dc = 0; dc < cols; dc++)
            if (dr || dc) hidden.add(key(r + dr, c + dc));
      }
    const csv = Array.from({
      length: transpose ? width : height
    }, () => Array(transpose ? height : width).fill(''));
    let html = '<div class="spreadsheet-wrap"><table class="report-table"><tbody>',
      dataIndex = -1;
    for (let r = 0; r < (transpose ? width : height); r++) {
      if (!transpose && rowKinds[r] === 'data') dataIndex++;
      const kind = transpose ? '' : rowKinds[r],
        tone = threshold && !transpose ? (kind === 'data' ? threshold.attrs(threshold.rowValue(
          dataIndex)) : kind === 'grand-total' ? threshold.attrs(threshold.totalValue) : '') : '';
      html +=
        `<tr${tone} data-row-kind="${kind}"${tone?'':` class="${kind==='grand-total'?'grand-total-row':kind==='subtotal'?'subtotal-row':''}"`}>`;
      for (let c = 0; c < (transpose ? height : width); c++) {
        const sr = transpose ? c : r,
          sc = transpose ? r : c,
          cell = matrix[sr][sc];
        if (hidden.has(key(sr, sc))) continue;
        const [rs, cs] = spans.get(key(sr, sc)), isHeader = cell.kind !== 'value', tag =
          isHeader ? 'th' : 'td', totalKind = rowKinds[sr], totalClass = totalKind ===
          'grand-total' ? 'grand-total-column' : totalKind === 'subtotal' ? 'subtotal-cell' : '',
          toneCell = threshold && transpose ? (totalKind === 'grand-total' ? threshold.attrs(
            threshold.totalValue) : totalKind === 'data' ? threshold.attrs(threshold.rowValue(
            rowKinds.slice(0, sr + 1).filter(k => k === 'data').length - 1)) : '') : '';
        csv[r][c] = cell.value;
        html +=
          `<${tag} rowspan="${transpose?cs:rs}" colspan="${transpose?rs:cs}"${toneCell||` class="${totalClass}"`}>${htmlEscape(cell.value)}</${tag}>`;
      }
      html += '</tr>';
    }
    return {
      html: html + '</tbody></table></div>',
      csv
    };
  }

  function compareWindowFieldValues(left, right, id) {
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    const field = customAttributes.find(item => item.id === id);
    if (field?.type === 'date') {
      const a = Date.parse(left),
        b = Date.parse(right);
      if (Number.isFinite(a) && Number.isFinite(b)) return a - b;
    }
    const numeric = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
    if (numeric.test(String(left).trim()) && numeric.test(String(right).trim())) return Number(
      left) - Number(right);
    return String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }

  function reportWindowTotal(item, matching, buckets, xKeys) {
    if (!item.aggregation.startsWith('table_')) return null;
    const partitions = new Set(matching.map(bucket => reportWindowPartition(item, bucket)));
    const selected = [...buckets.values()].filter(bucket => partitions.has(reportWindowPartition(
      item, bucket)) && (item.tableScope === 'filtered' || xKeys.includes(String(bucket.x))));
    return item.aggregation === 'table_sum' ? reportMetricValue(item.tableBaseMetric,
      mergeReportAggregates(selected)) : ReportingTools.statistic(selected.map(bucket =>
      reportMetricValue(item.tableBaseMetric, bucket)), item.aggregation);
  }

  function reportWindowPartition(item, bucket) {
    if (item.tablePartitionFields?.length) return JSON.stringify([bucket.period, ...item
      .tablePartitionFields.map(id => bucket.fieldValues?.[id] ?? null)
    ]);
    if (item.tablePartition === 'all') return String(bucket.period);
    if (item.tablePartition === 'category') return JSON.stringify([bucket.period, bucket.facet,
      bucket.x
    ]);
    return JSON.stringify([bucket.period, bucket.facet, bucket.series]);
  }

  function reportWindowSequenceValue(item, bucket, index, ordered) {
    const value = bucket.tableInputs[item.id],
      previous = ordered[index - 1]?.tableInputs[item.id];
    if (item.aggregation === 'previous_value') return index ? previous ?? null : null;
    if (item.aggregation === 'next_value') return ordered[index + 1]?.tableInputs[item.id] ??
      null;
    if (item.aggregation === 'running_difference_value') return value == null || previous ==
      null ? null : value - previous;
    if (item.aggregation === 'running_difference_percent') return value == null || previous ==
      null ? null : ReportingTools.divide(value - previous, previous);
    return null;
  }

  function applyReportTableCalculations(buckets, totals, xKeys, requiredIds) {
    const windows = customMetrics.filter(item => item.tableMode === 'window' && requiredIds.some(
        id => metricDependencyIds(id).includes(item.id))),
      ordered = [],
      visited = new Set();
    const visit = item => {
      if (visited.has(item.id)) return;
      visited.add(item.id);
      const parent = windows.find(value => value.id === item.tableBaseMetric);
      if (parent) visit(parent);
      ordered.push(item);
    };
    windows.forEach(visit);
    for (const bucket of buckets.values()) {
      bucket.tableValues = {};
      bucket.tableInputs = {};
    }
    for (const bucket of totals.values()) bucket.tableValues = {};
    const displayOrder = new Map(xKeys.map((x, i) => [String(x), i]));
    for (const item of ordered) {
      const selected = [...buckets.values()].filter(bucket => item.tableScope === 'filtered' ||
          displayOrder.has(String(bucket.x))),
        partitions = new Map();
      for (const bucket of selected) {
        const key = reportWindowPartition(item, bucket);
        if (!partitions.has(key)) partitions.set(key, []);
        partitions.get(key).push(bucket);
        bucket.tableInputs[item.id] = reportMetricValue(item.tableBaseMetric, bucket);
      }
      for (const values of partitions.values()) {
        values.sort((a, b) => {
          for (const field of item.tableOrderFields || []) {
            const av = a.fieldValues?.[field.id],
              bv = b.fieldValues?.[field.id];
            const cmp = compareWindowFieldValues(av, bv, field.id);
            if (cmp) return cmp * (field.direction === 'desc' ? -1 : 1);
          }
          return (item.tableOrderFields?.length ? String(a.x).localeCompare(String(b.x),
            undefined, {
              numeric: true
            }) : (displayOrder.get(String(a.x)) ?? Infinity) - (displayOrder.get(String(b
            .x)) ?? Infinity)) || String(a.series).localeCompare(String(b.series),
            undefined, {
              numeric: true
            }) || String(a.facet).localeCompare(String(b.facet), undefined, {
            numeric: true
          });
        });
        const isSequence = ['running_sum', 'running_difference_value',
          'running_difference_percent', 'previous_value', 'next_value'
        ].includes(item.aggregation);
        const result = isSequence ? null : item.aggregation === 'table_sum' ? reportMetricValue(
          item.tableBaseMetric, mergeReportAggregates(values)) : ReportingTools.statistic(values
          .map(bucket => bucket.tableInputs[item.id]), item.aggregation);
        let running = 0;
        values.forEach((bucket, index) => {
          bucket.tableValues[item.id] = item.aggregation === 'running_sum' ? running :
            isSequence ? reportWindowSequenceValue(item, bucket, index, values) : result;
          const value = bucket.tableInputs[item.id];
          if (value != null && Number.isFinite(Number(value))) running += Number(value);
        });
      }
      for (const [period, total] of totals) {
        const values = selected.filter(bucket => bucket.period === period);
        total.tableValues[item.id] = item.aggregation === 'table_sum' ? reportMetricValue(item
          .tableBaseMetric, mergeReportAggregates(values)) : item.aggregation.startsWith(
          'table_') ? ReportingTools.statistic(values.map(bucket => bucket.tableInputs[item
          .id]), item.aggregation) : null;
      }
    }
    return ordered;
  }

  function baseReportFormat(value, id) {
    return reportFormat(value, id);
  }

  function analysisFormat(value, id, config) {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    if (["share", "target", "change_percent"].includes(config.tableCalculation)) return (Number(
      value) * 100).toLocaleString(undefined, {
      maximumFractionDigits: 2
    }) + "%";
    if (config.tableCalculation === "rank") return String(value);
    return baseReportFormat(value, id);
  }

  function reportFormat(value, id) {
    if (value == null || !Number.isFinite(value)) return '—';
    const format = metricMeta(id).format;
    if (format === 'currency') return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
    if (format === 'percent')
      return `${(value * (metricMeta(id).percentScale === 'fraction' ? 100 : 1)).toFixed(2)}%`;
    return new Intl.NumberFormat().format(Math.round(value * 100) / 100)
  }

  function ageAt(dob, date) {
    if (!dob) return 'Unknown';
    const b = new Date(dob + 'T00:00:00'),
      e = reportDate(date);
    let age = e.getFullYear() - b.getFullYear();
    if (e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b
        .getDate())) age--;
    if (age < 25) return '18–24';
    if (age < 35) return '25–34';
    if (age < 45) return '35–44';
    if (age < 55) return '45–54';
    if (age < 65) return '55–64';
    return '65+'
  }

  function rawField(source, rowMap) {
    const [table, column] = String(source || '').split('.');
    return rowMap?.[table]?.[column] ?? ''
  }

  function dateDimensionFallback(custom, rowMap) {
    if (custom.type !== 'date') return null;
    const ref = String(custom.caseExpr || '').match(/\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/),
      raw = ref ? rawField(ref[1] + '.' + ref[2], rowMap) : null,
      d = expressionDate(raw);
    if (!d) return null;
    const expr = String(custom.caseExpr || ''),
      fn = (expr.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/) || [])[1]?.toUpperCase(),
      unit = (expr.match(/['"](year|quarter|month|week|day)['"]/i) || [])[1]?.toLowerCase(),
      part = custom.datePart || ((fn === 'DATE_TRUNC') ? unit : null);
    if (part === 'year' || fn === 'YEAR') return String(d.getFullYear());
    if (part === 'month' || fn === 'MONTH') return part === 'month' && custom.datePart ? d
      .toLocaleString(undefined, {
        month: 'long'
      }) : String(d.getMonth() + 1);
    if (part === 'day' || fn === 'DAY') return String(d.getDate());
    if (part === 'week' || fn === 'WEEK') return String(Math.ceil((((d - new Date(d.getFullYear(),
      0, 1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7));
    if (fn === 'WEEKDAY') return d.toLocaleString(undefined, {
      weekday: 'long'
    });
    if (part === 'quarter' || fn === 'QUARTER') return String(Math.floor(d.getMonth() / 3) + 1);
    if (fn === 'DAYOFYEAR') return String(Math.floor((d - new Date(d.getFullYear(), 0, 0)) /
      86400000));
    if (fn === 'HOUR') return String(d.getHours());
    if (fn === 'MINUTE') return String(d.getMinutes());
    if (fn === 'SECOND') return String(d.getSeconds());
    if (fn === 'DAYNAME') return d.toLocaleString(undefined, {
      weekday: 'long'
    });
    if (fn === 'MONTHNAME') return d.toLocaleString(undefined, {
      month: 'long'
    });
    return expressionDateKey(d)
  }

  function dimensionValue(dim, user, plan, eventDate, rowMap = {}, dimensionStack = [],
    caseTrace = null) {
    if (dim === 'none') return 'All';
    const custom = customAttributes.find(a => a.id === dim);
    if (!custom) return 'All';
    if (dimensionStack.includes(custom.id)) throw new Error('Circular dimension reference: ' +
      custom.lookmlName);
    if (custom.caseExpr) {
      try {
        const value = evaluateExpression(custom.caseExpr, rowMap, [], [...dimensionStack, custom
          .id
        ], caseTrace);
        return value == null || value === '' ? '(Unknown)' : String(value)
      } catch (e) {
        const fallback = dateDimensionFallback(custom, rowMap);
        if (fallback !== null) return fallback;
        console.warn('Data Dictionary dimension formula failed:', custom.lookmlName || custom.id,
          e);
        const status = $('definitionStatus');
        if (status) {
          status.textContent =
            `Dimension formula error (${custom.lookmlName||custom.name}): ${e.message}. Expression: ${custom.caseExpr}. Review the SQL in the Data Dictionary.`;
          status.classList.add('error')
        }
        return '(Invalid formula)'
      }
    }
    if (custom.source) {
      let value = rawField(custom.source, rowMap);
      if (custom.datePart && value !== '' && value != null) {
        const d = reportDate(value);
        if (custom.datePart === 'year') value = d.getFullYear();
        else if (custom.datePart === 'month') value = d.toLocaleString(undefined, {
          month: 'long'
        });
        else if (custom.datePart === 'week') value = Math.ceil((((d - new Date(d.getFullYear(), 0,
          1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
        else if (custom.datePart === 'weekday') value = d.toLocaleString(undefined, {
          weekday: 'long'
        })
      }
      if (value !== '' && value != null && fieldType(...custom.source.split('.')) === 'date' && !
        custom.datePart) {
        const date = reportDate(value);
        return custom.source.endsWith('.date') || custom.source.endsWith('.dob') ? localDateKey(
          date) : date.toLocaleString()
      }
      return value === '' || value == null ? '(Unknown)' : String(value)
    }
    return dimensionValue(custom.base, user, plan, eventDate, rowMap, dimensionStack, caseTrace)
  }

  function dimensionDisplayValue(dim, user, plan, eventDate, rowMap = {}) {
    if (dim === 'none') return 'All';
    return dimensionValue(dim, user, plan, eventDate, rowMap)
  }

  function filterDimensionValues(dim) {
    if (!dim) return [];
    if (dimensionValueCache[dim]?.size) return [...dimensionValueCache[dim]].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        numeric: true
      }));
    if (dim === 'state') return [...new Set(PLACES.map(p => p[0]))].sort();
    if (dim === 'city') return [...new Set(PLACES.map(p => p[1]))].sort();
    if (dim === 'zipcode') return [...new Set(PLACES.map(p => p[2]))].sort();
    if (dim === 'age') return ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
    if (dim === 'campaign_source') return SOURCES.slice().sort();
    if (dim === 'campaign_name') return [...new Set(Object.values(appState?.campaign || {}))]
      .sort();
    if (dim === 'subscription_length') return ['1 month', '3 months', '12 months'];
    const custom = customAttributes.find(a => a.id === dim);
    if (!custom) return [];
    if (custom.base) return filterDimensionValues(custom.base);
    const sourceTables = new Set(),
      collectSources = (item, seen = new Set()) => {
        if (!item || seen.has(item.id)) return;
        seen.add(item.id);
        if (item.source) sourceTables.add(item.source.split('.')[0]);
        for (const match of (item.caseExpr || '').matchAll(
            /\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/g)) sourceTables.add(match[1]);
        for (const match of (item.caseExpr || '').matchAll(
            /\[dimension:([a-zA-Z_][a-zA-Z0-9_]*)\]/g)) {
          const dependency = customAttributes.find(candidate => candidate.lookmlName
            ?.toLowerCase() === match[1].toLowerCase());
          if (dependency) collectSources(dependency, seen)
        }
      };
    collectSources(custom);
    const tablesToSample = [...sourceTables],
      primary = tablesToSample[0];
    if (!primary) return [];
    const rows = tables?.[primary]?.preview || [],
      values = rows.map(row => {
        const rowMap = {
          [primary]: row
        };
        for (const table of tablesToSample.slice(1)) {
          const candidates = tables?.[table]?.preview || [],
            keys = ['subscription_id', 'user_id', 'transaction_id', 'scheduled_payment_id'];
          const linked = candidates.find(candidate => keys.some(key => row[key] != null &&
            String(candidate[key]) === String(row[key])));
          if (linked) rowMap[table] = linked
        }
        return dimensionValue(dim, rowMap.user_records, rowMap.subscription_records
          ?.subscription_length, null, rowMap)
      }).filter(value => value && value !== 'Unknown' && value !== 'Invalid formula');
    return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), undefined, {
      numeric: true
    }));
  }

  function cacheDimensionValue(id, value) {
    if (value == null || value === '') return;
    (dimensionValueCache[id] || (dimensionValueCache[id] = new Set())).add(String(value))
  }

  function cacheGeneratedDimensionValues(data) {
    for (const user of data.user_records || []) {
      for (const id of ['state', 'city', 'zipcode', 'campaign_source', 'campaign_name'])
        cacheDimensionValue(id, user[id]);
    }
    for (const sub of data.subscription_records || []) cacheDimensionValue('subscription_length',
      `${sub.subscription_length} month${Number(sub.subscription_length)===1?'':'s'}`)
  }

  function filterPickerHtml(scope, dimension, filter = {}) {
    const values = filterDimensionValues(dimension);
    const legacy = filter.values || String(filter.value || '').split(',').map(v => v.trim())
      .filter(Boolean),
      included = new Set(filter.includeValues || (filter.operator === 'neq' ? [] : legacy)),
      excluded = new Set(filter.excludedValues || (filter.operator === 'neq' ? legacy : [])),
      count = included.size + excluded.size,
      summary = count ? `${included.size} included · ${excluded.size} excluded` : 'All values';
    return `<div class="filter-picker" data-filter-picker="${scope}" data-filter-dimension="${htmlEscape(dimension||'')}"><button type="button" class="filter-picker-toggle" data-filter-picker-toggle>${htmlEscape(summary)} ▾</button><div class="filter-picker-menu" hidden><input type="search" class="filter-picker-search" placeholder="Search values…" aria-label="Search dimension values" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="filter_suggestions_${htmlEscape(scope.replace(/[^a-zA-Z0-9_-]/g,'_'))}"><div class="filter-autocomplete-suggestions" id="filter_suggestions_${htmlEscape(scope.replace(/[^a-zA-Z0-9_-]/g,'_'))}" role="listbox" hidden></div><div class="filter-picker-bulk"><button type="button" data-filter-bulk="include">Select all</button><button type="button" data-filter-bulk="exclude">Exclude all</button><button type="button" data-filter-bulk="clear">Unselect all</button></div><div class="filter-picker-options">${values.map(value=>{const state=included.has(String(value))?'include':excluded.has(String(value))?'exclude':'none',mark=state==='include'?'✓':state==='exclude'?'×':'◻';return`<button type="button" class="filter-value-option state-${state}" data-filter-value="${htmlEscape(value)}" data-filter-state="${state}"><span class="filter-value-mark">${mark}</span><span>${htmlEscape(value)}</span></button>`}).join('')||'<small class="filter-values-empty">Generate data or choose a dimension with available values.</small>'}</div></div></div>`
  }

  function updateFilterAutocomplete(search) {
    const query = search.value.trim().toLowerCase(),
      picker = search.closest('.filter-picker');
    const options = [...picker.querySelectorAll('[data-filter-value]')];
    options.forEach(button => button.hidden = !button.dataset.filterValue.toLowerCase().includes(
      query));
    const matches = options.filter(button => !button.hidden).sort((a, b) =>
      Number(b.dataset.filterValue.toLowerCase().startsWith(query)) - Number(a.dataset
        .filterValue.toLowerCase().startsWith(query)));
    const list = picker.querySelector('.filter-autocomplete-suggestions');
    if (!list) return;
    list.hidden = !query || !matches.length;
    search.setAttribute('aria-expanded', String(!list.hidden));
    list.innerHTML = matches.slice(0, 5).map(button =>
      `<button type="button" role="option" data-filter-autofill="${htmlEscape(button.dataset.filterValue)}">${htmlEscape(button.dataset.filterValue)}</button>`
    ).join('');
  }

  function completeFilterSearch(button) {
    const picker = button.closest('.filter-picker'),
      search = picker.querySelector('.filter-picker-search');
    search.value = button.dataset.filterAutofill;
    updateFilterAutocomplete(search);
    picker.querySelector('.filter-autocomplete-suggestions').hidden = true;
    search.setAttribute('aria-expanded', 'false');
    search.focus();
  }

  function syncFilterPicker(picker) {
    const scope = picker.dataset.filterPicker;
    if (!scope.startsWith('module:')) return;
    const [, widgetId, indexText] = scope.split(':'), widget = activeSheet().widgets.find(item =>
        String(item.id) === decodeURIComponent(widgetId || '')), buttons = [...picker
        .querySelectorAll('[data-filter-value]')
      ], included = buttons.filter(b => b.dataset.filterState === 'include').map(b => b.dataset
        .filterValue), excluded = buttons.filter(b => b.dataset.filterState === 'exclude').map(
        b => b.dataset.filterValue), summary = picker.querySelector('.filter-picker-toggle'),
      filter = widget?.config?.filterDraft?.[Number(indexText)];
    if (summary) summary.textContent = included.length || excluded.length ?
      `${included.length} included · ${excluded.length} excluded ▾` : 'All values ▾';
    if (filter) {
      Object.assign(filter, {
        includeValues: included,
        excludedValues: excluded,
        values: included,
        operator: 'eq'
      });
      persistReporting();
      renderModuleFilterActions(widget)
    }
  }

  function positionFilterMenu(picker) {
    const toggle = picker.querySelector('[data-filter-picker-toggle]'),
      menu = picker.querySelector('.filter-picker-menu');
    if (!toggle || !menu) return;
    const rect = toggle.getBoundingClientRect(),
      width = Math.min(300, window.innerWidth - 16),
      height = Math.min(340, window.innerHeight - 16),
      left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      below = window.innerHeight - rect.bottom - 8,
      top = below >= Math.min(height, 220) ? rect.bottom + 4 : Math.max(8, rect.top - height - 4);
    menu.style.position = 'fixed';
    menu.style.zIndex = '10000';
    menu.style.width = `${width}px`;
    menu.style.maxHeight = `${height}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.right = 'auto'
  }

  function handleFilterPickerAction(event) {
    const picker = event.target.closest('[data-filter-picker]');
    if (!picker) return false;
    const toggle = event.target.closest('[data-filter-picker-toggle]');
    if (toggle) {
      const menu = picker.querySelector('.filter-picker-menu'),
        opening = menu.hidden;
      document.querySelectorAll('.filter-picker-menu:not([hidden])').forEach(item => {
        item.hidden = true
      });
      menu.hidden = !opening;
      if (opening) positionFilterMenu(picker);
      return true
    }
    const bulk = event.target.closest('[data-filter-bulk]');
    if (bulk) {
      const state = bulk.dataset.filterBulk === 'include' ? 'include' : bulk.dataset
        .filterBulk === 'exclude' ? 'exclude' : 'none';
      picker.querySelectorAll('[data-filter-value]').forEach(button => setFilterValueState(button,
        state));
      syncFilterPicker(picker);
      return true
    }
    const option = event.target.closest('[data-filter-value]');
    if (option) {
      const next = option.dataset.filterState === 'none' ? 'include' : option.dataset
        .filterState === 'include' ? 'exclude' : 'none';
      setFilterValueState(option, next);
      syncFilterPicker(picker);
      return true
    }
    return false
  }

  function setFilterValueState(button, state) {
    button.dataset.filterState = state;
    button.classList.remove('state-none', 'state-include', 'state-exclude');
    button.classList.add(`state-${state}`);
    button.querySelector('.filter-value-mark').textContent = state === 'include' ? '✓' : state ===
      'exclude' ? '×' : '◻'
  }

  function caseKeywordPositions(source) {
    const found = [];
    let quote = '',
      depth = 0;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (quote) {
        if (ch === '\\') {
          i++;
          continue
        }
        if (ch === quote) {
          if (source[i + 1] === quote) {
            i++;
            continue
          }
          quote = ''
        }
        continue
      }
      if (ch === '\'' || ch === '"') {
        quote = ch;
        continue
      }
      if (ch === '(') {
        depth++;
        continue
      }
      if (ch === ')') {
        depth = Math.max(0, depth - 1);
        continue
      }
      if (depth === 0 && /[A-Za-z_]/.test(ch)) {
        let end = i + 1;
        while (end < source.length && /[A-Za-z_]/.test(source[end])) end++;
        const word = source.slice(i, end).toUpperCase();
        if (word === 'WHEN' || word === 'THEN' || word === 'ELSE') {
          const before = source[i - 1] || ' ',
            after = source[end] || ' ';
          if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) found.push({
            word,
            start: i,
            end
          })
        }
        i = end - 1
      }
    }
    return found
  }

  function expandCase(source, trace = false) {
    let result = String(source),
      guard = 0;
    while (/\bCASE\b/i.test(result)) {
      if (++guard > 100) throw new Error('CASE expression nesting is too deep.');
      let quote = '',
        pairs = [],
        stack = [];
      for (let i = 0; i < result.length; i++) {
        const ch = result[i];
        if (quote) {
          if (ch === '\\') {
            i++;
            continue
          }
          if (ch === quote) {
            if (result[i + 1] === quote) {
              i++;
              continue
            }
            quote = ''
          }
          continue
        }
        if (ch === '\'' || ch === '"') {
          quote = ch;
          continue
        }
        if (/[A-Za-z_]/.test(ch)) {
          let end = i + 1;
          while (end < result.length && /[A-Za-z_]/.test(result[end])) end++;
          const word = result.slice(i, end).toUpperCase(),
            before = result[i - 1] || ' ',
            after = result[end] || ' ';
          if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) {
            if (word === 'CASE') stack.push({
              start: i,
              bodyStart: end
            });
            else if (word === 'END') {
              const open = stack.pop();
              if (!open) throw new Error('END found without CASE.');
              pairs.push({
                ...open,
                end: i
              })
            }
          }
          i = end - 1
        }
      }
      if (stack.length) throw new Error('CASE expression requires END.');
      const pair = pairs[0];
      if (!pair) throw new Error('Could not parse CASE expression.');
      const body = result.slice(pair.bodyStart, pair.end),
        keywords = caseKeywordPositions(body),
        whenPositions = keywords.filter(k => k.word === 'WHEN'),
        elsePosition = keywords.find(k => k.word === 'ELSE');
      if (!whenPositions.length) throw new Error('CASE requires at least one WHEN branch.');
      const prefix = body.slice(0, whenPositions[0].start).trim();
      if (prefix && keywords.some(k => k.word === 'THEN' && k.start < whenPositions[0].start))
        throw new Error('Invalid CASE expression.');
      const clauses = [];
      whenPositions.forEach((when, index) => {
        const stop = whenPositions[index + 1]?.start ?? elsePosition?.start ?? body.length,
          then = keywords.find(k => k.word === 'THEN' && k.start > when.end && k.start <
            stop);
        if (!then) throw new Error('Each CASE branch needs THEN.');
        const condition = body.slice(when.end, then.start).trim(),
          value = body.slice(then.end, stop).trim();
        if (!condition || !value) throw new Error('CASE WHEN and THEN need values.');
        clauses.push([prefix ? `(${prefix}) = (${condition})` : condition, value, index + 1])
      });
      const fallback = elsePosition ? body.slice(elsePosition.end).trim() : 'null';
      if (elsePosition && !fallback) throw new Error('CASE ELSE needs a value.');
      const terminal = trace ? `CASE_BRANCH(\"ELSE\", (${fallback}))` : fallback,
        expanded = clauses.reverse().reduce((otherwise, [condition, value, branch]) =>
          `((${condition}) ? (${trace?`CASE_BRANCH(\"WHEN ${branch}\", (${value}))`:value}) : (${otherwise}))`,
          terminal);
      result = result.slice(0, pair.start) + expanded + result.slice(pair.end + 3)
    }
    return result
  }

  function expressionDate(value) {
    if (value == null || value === '') return null;
    const d = value instanceof Date ? value : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/
      .test(value) ? parseDateInput(value) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d
  }

  function expressionDateKey(value) {
    const d = expressionDate(value);
    return d ? `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` : null
  }

  function sqlDateDiff(...args) {
    let unit = 'day',
      start, end;
    if (args.length >= 3) {
      unit = String(args[0] ?? 'day').toLowerCase();
      start = args[1];
      end = args[2]
    } else [start, end] = args;
    const a = expressionDate(start),
      b = expressionDate(end);
    if (!a || !b) return null;
    const delta = b.getTime() - a.getTime(),
      sign = delta < 0 ? -1 : 1;
    switch (unit.replace(/s$/, '')) {
      case 'millisecond':
        return Math.trunc(delta);
      case 'second':
        return Math.trunc(delta / 1000);
      case 'minute':
        return Math.trunc(delta / 60000);
      case 'hour':
        return Math.trunc(delta / 3600000);
      case 'week':
        return Math.trunc(delta / 604800000);
      case 'month':
      case 'quarter':
      case 'year': {
        let lo = sign < 0 ? b : a,
          hi = sign < 0 ? a : b,
          months = (hi.getFullYear() - lo.getFullYear()) * 12 + hi.getMonth() - lo.getMonth(),
          day = Math.min(lo.getDate(), new Date(lo.getFullYear(), lo.getMonth() + months + 1, 0)
            .getDate()),
          anchor = new Date(lo.getFullYear(), lo.getMonth() + months, day, lo.getHours(), lo
            .getMinutes(), lo.getSeconds(), lo.getMilliseconds());
        if (anchor > hi) months--;
        if (unit.replace(/s$/, '') === 'year') months = Math.trunc(months / 12);
        if (unit.replace(/s$/, '') === 'quarter') months = Math.trunc(months / 3);
        return sign * months
      }
      default:
        return Math.trunc(delta / 86400000)
    }
  }

  function maskSqlStringLiterals(source, literals) {
    return String(source).replace(/'(?:''|\\.|[^'\\])*'|"(?:""|\\.|[^"\\])*"/g, literal => {
      const quote = literal[0],
        inner = literal.slice(1, -1),
        value = quote === "'" ? inner.replace(/''/g, "'") : inner.replace(/""/g, '"'),
        slot = literals.push(JSON.stringify(value)) - 1;
      return `__SQL_LITERAL_${slot}__`
    })
  }

  function sqlValueExpression(value, literals) {
    if (value == null) return 'null';
    if (typeof value === 'string') {
      const slot = literals.push(JSON.stringify(value)) - 1;
      return `__SQL_LITERAL_${slot}__`
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : 'null'
  }

  function restoreSqlStringLiterals(source, literals) {
    return source.replace(/__SQL_LITERAL_(\d+)__/g, (_, index) => literals[Number(index)] ??
      'null')
  }

  function splitSqlValueList(source) {
    const result = [];
    let depth = 0,
      start = 0;
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') depth--;
      else if (source[i] === ',' && depth === 0) {
        result.push(source.slice(start, i).trim());
        start = i + 1
      }
    }
    result.push(source.slice(start).trim());
    if (result.some(value => !value)) throw new Error('IN list contains an empty value.');
    return result
  }

  function rewriteSqlPredicates(source) {
    const atom = String
      .raw`(?:__SQL_LITERAL_\d+__|\b(?:null|true|false)\b|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|[A-Za-z_]\w*\([^()]*\)|\([^()]*\)|[A-Za-z_]\w*)`;
    source = source.replace(new RegExp(`(${atom})\\s+(NOT\\s+)?IN\\s*\\(([^()]*)\\)`, 'gi'), (_,
      value, negated, list) => {
      const values = splitSqlValueList(list);
      return `${negated?'SQL_NOT_IN':'SQL_IN'}(${value},${values.join(',')})`
    });
    source = source.replace(new RegExp(`(${atom})\\s+IS\\s+(NOT\\s+)?NULL\\b`, 'gi'), (_, value,
      negated) => `${negated?'SQL_IS_NOT_NULL':'SQL_IS_NULL'}(${value})`);
    source = source.replace(new RegExp(
        `(${atom})\\s+(NOT\\s+)?BETWEEN\\s+(${atom})\\s+AND\\s+(${atom})`, 'gi'), (_, value,
        negated, low, high) =>
      `${negated?'SQL_NOT_BETWEEN':'SQL_BETWEEN'}(${value},${low},${high})`);
    source = source.replace(new RegExp(`(${atom})\\s+(NOT\\s+)?LIKE\\s+(${atom})`, 'gi'), (_,
      value, negated, pattern) => `${negated?'SQL_NOT_LIKE':'SQL_LIKE'}(${value},${pattern})`);
    return source
  }

  function sqlIn(value, ...choices) {
    if (value == null) return null;
    if (choices.some(choice => choice != null && choice === value)) return true;
    return choices.some(choice => choice == null) ? null : false
  }

  function sqlNotIn(value, ...choices) {
    const result = sqlIn(value, ...choices);
    return result == null ? null : !result
  }

  function sqlBetween(value, low, high) {
    if (value == null || low == null || high == null) return null;
    return value >= low && value <= high
  }

  function sqlLike(value, pattern) {
    if (value == null || pattern == null) return null;
    const escape = value => value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'),
      source = [...String(pattern)].map(char => char === '%' ? '.*' : char === '_' ? '.' : escape(
        char)).join('');
    return new RegExp('^' + source + '$', 's').test(String(value))
  }
  const SQL_FUNCTIONS = {
    SQL_ADD: (a, b) => ReportingTools.arithmetic('add', a, b),
    SQL_SUBTRACT: (a, b) => ReportingTools.arithmetic('subtract', a, b),
    SQL_MULTIPLY: (a, b) => ReportingTools.arithmetic('multiply', a, b),
    SQL_DIVIDE: (a, b) => ReportingTools.divide(a, b),
    SQL_MOD: (a, b) => ReportingTools.arithmetic('mod', a, b),
    SQL_COMPARE: (op, a, b) => ReportingTools.compare(op, a, b),
    SQL_AND: (a, b) => ReportingTools.logic('and', a, b),
    SQL_OR: (a, b) => ReportingTools.logic('or', a, b),
    SQL_NOT: a => ReportingTools.logic('not', a),
    SQL_IN: sqlIn,
    SQL_NOT_IN: sqlNotIn,
    SQL_IS_NULL: value => value == null,
    SQL_IS_NOT_NULL: value => value != null,
    SQL_BETWEEN: sqlBetween,
    SQL_NOT_BETWEEN: (...values) => {
      const result = sqlBetween(...values);
      return result == null ? null : !result
    },
    SQL_LIKE: sqlLike,
    SQL_NOT_LIKE: (...values) => {
      const result = sqlLike(...values);
      return result == null ? null : !result
    },
    DATE: value => expressionDateKey(value),
    TIMESTAMP: value => {
      const d = expressionDate(value);
      return d ? d.toISOString().replace('.000Z', 'Z') : null
    },
    CURRENT_DATE: () => expressionDateKey(new Date()),
    YEAR: value => expressionDate(value)?.getFullYear() ?? null,
    MONTH: value => expressionDate(value)?.getMonth() + 1 ?? null,
    DAY: value => expressionDate(value)?.getDate() ?? null,
    WEEKDAY: value => expressionDate(value)?.getDay() ?? null,
    WEEK: value => {
      const d = expressionDate(value);
      return d ? Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + new Date(d
        .getFullYear(), 0, 1).getDay() + 1) / 7) : null
    },
    QUARTER: value => {
      const d = expressionDate(value);
      return d ? Math.floor(d.getMonth() / 3) + 1 : null
    },
    DATE_TRUNC: (unit, value) => {
      const d = expressionDate(value),
        part = String(unit).toLowerCase();
      if (!d) return null;
      if (part === 'year') d.setMonth(0, 1);
      else if (part === 'quarter') d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
      else if (part === 'month') d.setDate(1);
      else if (part === 'week') {
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      } else d.setHours(0, 0, 0, 0);
      return expressionDateKey(d)
    },
    DATEDIFF: sqlDateDiff,
    SAFE_DIVIDE: (numerator, denominator) => {
      const n = Number(numerator),
        d = Number(denominator);
      return numerator == null || denominator == null || denominator === '' || !Number
        .isFinite(n) || !Number.isFinite(d) || d === 0 ? null : n / d
    },
    COUNT_IF: condition => condition === true ? 1 : condition === false || condition == null ?
      0 : Number(condition) ? 1 : 0,
    REGEXP_EXTRACT: (value, pattern, group = 1) => {
      if (value == null || pattern == null) return null;
      const match = String(value).match(new RegExp(String(pattern))),
        index = Number(group);
      return match ? (match[index] ?? (index === 1 ? match[0] : null)) : null
    },
    DATE_ADD: (value, amount, unit = 'day') => {
      const d = expressionDate(value);
      if (!d) return null;
      const n = Number(amount) || 0;
      switch (String(unit).toLowerCase()) {
        case 'year':
          d.setFullYear(d.getFullYear() + n);
          break;
        case 'month':
          d.setMonth(d.getMonth() + n);
          break;
        case 'week':
          d.setDate(d.getDate() + 7 * n);
          break;
        default:
          d.setDate(d.getDate() + n)
      }
      return expressionDateKey(d)
    },
    CONCAT: (...v) => v.map(x => x ?? '').join(''),
    LOWER: value => String(value ?? '').toLowerCase(),
    UPPER: value => String(value ?? '').toUpperCase(),
    TRIM: value => String(value ?? '').trim(),
    COALESCE: (...v) => v.find(x => x !== null && x !== undefined && x !== '') ?? null,
    ABS: value => Math.abs(Number(value)),
    ROUND: (value, digits = 0) => {
      const scale = 10 ** Number(digits || 0);
      return Math.round(Number(value) * scale) / scale
    },
    FLOOR: value => Math.floor(Number(value)),
    CEIL: value => Math.ceil(Number(value)),
    NULLIF: (a, b) => a === b ? null : a,
    SUBSTR: (v, start, length) => String(v ?? '').substr(Number(start) || 0, length == null ?
      undefined : Number(length)),
    LENGTH: value => String(value ?? '').length,
    REPLACE: (value, search, replacement) => String(value ?? '').split(String(search ?? ''))
      .join(String(replacement ?? '')),
    MOD: (a, b) => Number(a) % Number(b),
    POWER: (a, b) => Number(a) ** Number(b),
    GREATEST: (...values) => Math.max(...values.map(Number)),
    LEAST: (...values) => Math.min(...values),
    HOUR: value => expressionDate(value)?.getHours() ?? null,
    MINUTE: value => expressionDate(value)?.getMinutes() ?? null,
    SECOND: value => expressionDate(value)?.getSeconds() ?? null,
    DAYOFYEAR: value => {
      const d = expressionDate(value);
      return d ? Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000) : null
    },
    DAYNAME: value => expressionDate(value)?.toLocaleString(undefined, {
      weekday: 'long'
    }) ?? null,
    MONTHNAME: value => expressionDate(value)?.toLocaleString(undefined, {
      month: 'long'
    }) ?? null
  };

  Object.assign(SQL_FUNCTIONS, {
    ABS: value => ReportingTools.numericFunction('ABS', [value]),
    ROUND: (value, digits = 0) => ReportingTools.numericFunction('ROUND', [value, digits]),
    FLOOR: value => ReportingTools.numericFunction('FLOOR', [value]),
    CEIL: value => ReportingTools.numericFunction('CEIL', [value]),
    MOD: (a, b) => ReportingTools.numericFunction('MOD', [a, b]),
    POWER: (a, b) => ReportingTools.numericFunction('POWER', [a, b]),
    GREATEST: (...values) => ReportingTools.numericFunction('GREATEST', values),
    LEAST: (...values) => ReportingTools.numericFunction('LEAST', values)
  });

  function metricRowValue(metric, rowMap, stack = [], dimensionStack = [], caseTrace = null) {
    if (!metric) return null;
    if (stack.includes(metric.id)) throw new Error('Circular measure reference: ' + (metric
      .lookmlName || metric.id));
    if (metric.kind === 'column') return ReportingTools.numeric(rawField(metric.source, rowMap));
    if (metric.kind === 'ratio') {
      const numerator = customMetrics.find(m => m.id === metric.numerator),
        denominator = customMetrics.find(m => m.id === metric.denominator),
        a = metricRowValue(numerator, rowMap, [...stack, metric.id], dimensionStack, caseTrace),
        b = metricRowValue(denominator, rowMap, [...stack, metric.id], dimensionStack, caseTrace);
      return ReportingTools.divide(a, b)
    }
    if (metric.formula) return evaluateExpression(metric.formula, rowMap, [...stack, metric.id],
      dimensionStack, caseTrace);
    return 0
  }

  function evaluateExpression(expression, rowMap, stack = [], dimensionStack = [], caseTrace =
    null) {
    expression = String(expression || '').replace(
      /\bPARAMETER\(\s*['"]([A-Za-z_]\w*)['"]\s*\)|'(?:''|[^'])*'|"(?:\\.|[^"\\])*"/gi,
      (token, name) => {
        if (!name) return token;
        const defaults = typeof reportParameters !== 'undefined' ? Object.fromEntries(
          reportParameters.map(p => [p.name, p.default])) : (customMetrics.find(m => m
          .parameterDefaults)?.parameterDefaults || {});
        const values = {
          ...defaults,
          ...rowMap?.__parameters
        };
        if (!Object.hasOwn(values, name)) throw Error('Unknown parameter: ' + name);
        const value = values[name];
        return typeof value === 'number' ? String(value) : typeof value === 'boolean' ? (value ?
          'TRUE' : 'FALSE') : "'" + String(value).replace(/'/g, "''") + "'";
      });
    const preparationKey = String(expression || '').trim(),
      prepared = !Array.isArray(caseTrace) && expressionPreparationCache.get(preparationKey),
      literals = prepared ? [...prepared.literals] : [];
    let source = prepared ? prepared.source : expandCase(maskSqlStringLiterals(preparationKey,
      literals), Array.isArray(caseTrace));
    if (!prepared && !Array.isArray(caseTrace)) {
      if (expressionPreparationCache.size >= 512) expressionPreparationCache.clear();
      expressionPreparationCache.set(preparationKey, {
        source,
        literals: [...literals]
      })
    }
    source = source.replace(/\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/g, (_, table, column) =>
      sqlValueExpression(rowMap?.[table]?.[column] ?? null, literals));
    source = source.replace(/\[dimension:([a-zA-Z_][a-zA-Z0-9_]*)\]/g, (_, name) => {
      const dim = customAttributes.find(a => a.lookmlName?.toLowerCase() === name
        .toLowerCase() || lookmlIdentifier(a.name) === name.toLowerCase());
      if (!dim) throw new Error(`Unknown dimension reference: ${name}`);
      if (dimensionStack.includes(dim.id)) throw new Error(
        `Circular dimension reference: ${name}`);
      const value = dimensionValue(dim.id, rowMap?.user_records, rowMap?.subscription_records
        ?.subscription_length, rowMap?.transaction_records?.transaction_ts || rowMap
        ?.scheduled_subscription_payment_records?.scheduled_payment_ts, rowMap,
        dimensionStack, caseTrace);
      return sqlValueExpression(value, literals)
    });
    source = source.replace(/\{\{([^}]+)\}\}/g, (_, name) => {
      const m = customMetrics.find(x => x.id === name || x.lookmlName?.toLowerCase() === name
        .trim().toLowerCase() || x.label.toLowerCase() === name.trim().toLowerCase());
      if (!m) {
        const builtin = Object.keys(REPORT_METRICS).find(k => k.toLowerCase() === name.trim()
          .toLowerCase() || REPORT_METRICS[k].label.toLowerCase() === name.trim()
          .toLowerCase());
        if (builtin) return '0';
        throw new Error(`Unknown metric reference: ${name}`)
      }
      if (stack.includes(m.id)) throw new Error(
        `Circular measure reference: ${m.lookmlName||m.id}`);
      return sqlValueExpression(metricRowValue(m, rowMap, [...stack, m.id], dimensionStack,
        caseTrace), literals)
    });
    source = source.replace(
      /EXTRACT\s*\(\s*(YEAR|MONTH|DAY|WEEK|QUARTER|DOW|DOY)\s+FROM\s+([^()]*(?:\([^()]*\)[^()]*)?)\)/gi,
      (_, part, value) =>
      `${part.toUpperCase()==='DOW'?'WEEKDAY':part.toUpperCase()==='DOY'?'DAYOFYEAR':part.toUpperCase()}(${value.trim()})`
    ).replace(
      /DATEPART\s*\(\s*(['"]?)(YEAR|MONTH|DAY|WEEK|WEEKDAY|QUARTER)\1\s*,\s*([^()]*(?:\([^()]*\)[^()]*)?)\)/gi,
      (_, q, part, value) => `${part.toUpperCase()}(${value.trim()})`);
    source = maskSqlStringLiterals(source, literals);
    source = rewriteSqlPredicates(source);
    source = source.replace(/\bNOT\b/gi, '!').replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||')
      .replace(/\bTRUE\b/gi,
        'true').replace(/\bFALSE\b/gi, 'false').replace(/\bNULL\b/gi, 'null').replace(/<>/g, '!=')
      .replace(/(?<![<>=!])=(?!=)/g, '==');
    source = source.replace(
      /\b(date|timestamp|current_date|year|month|day|weekday|week|quarter|date_trunc|datediff|date_add|safe_divide|count_if|regexp_extract|concat|lower|upper|trim|coalesce|abs|round|floor|ceil|nullif|substr|length|replace|mod|power|greatest|least|hour|minute|second|dayofyear|dayname|monthname)\s*(?=\()/gi,
      fn => fn.toUpperCase());
    source = restoreSqlStringLiterals(source, literals);
    source = ReportingTools.compileNullSafeExpression(source);
    const stripped = source.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '0'),
      names = Object.keys(SQL_FUNCTIONS),
      helpers = Array.isArray(caseTrace) ? ['CASE_BRANCH'] : [],
      allowed = new Set([...names, ...helpers, 'TRUE', 'FALSE', 'NULL']),
      identifiers = stripped.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [],
      unsupported = identifiers.find(name => !allowed.has(name.toUpperCase()));
    if (unsupported) throw new Error(
      `Unsupported SQL token: ${unsupported}. Use supported SQL predicates, arithmetic, CASE, and date/string functions.`
    );
    if (!/^[0-9eE+\-*/%().<>=!&|?:,\sA-Za-z_'"\\]+$/.test(stripped)) throw new Error(
      'Formula has unsupported syntax. Use field references, SQL predicates, arithmetic, CASE, and supported functions.'
    );
    const literalValues = [],
      functionSource = source.replace(/"(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
        literal => {
          const index = literalValues.push(literal[0] === '"' ? JSON.parse(literal) : Number(
            literal)) - 1;
          return `__sql_literal_${index}`
        }),
      cacheKey = functionSource + '|' + helpers.join(','),
      parameters = [...names, ...helpers, ...literalValues.map((_, index) =>
        `__sql_literal_${index}`)];
    let compiled = expressionFunctionCache.get(cacheKey);
    if (!compiled) {
      compiled = Function(...parameters, '"use strict";return (' + functionSource + ')');
      if (expressionFunctionCache.size >= 512) expressionFunctionCache.clear();
      expressionFunctionCache.set(cacheKey, compiled)
    }
    const result = compiled(...names.map(name => SQL_FUNCTIONS[name]), ...(helpers.length ? [(
      branch,
      value) => {
      caseTrace.push(branch);
      return value
    }] : []), ...literalValues);
    if (typeof result === 'number' && !Number.isFinite(result)) return null;
    return result;
  }

  function evaluateFormula(expression, rowMap, stack = [], caseTrace = null) {
    const value = evaluateExpression(expression, rowMap, stack, [], caseTrace);
    if (value === true) return 1;
    if (value === false) return 0;
    if (value == null) return null;
    if (!Number.isFinite(Number(value))) throw new Error(
      'Metric formula must return a finite number.');
    return Number(value)
  }

  function dimensionFieldRefs(id, seen = []) {
    if (seen.includes(id)) return [];
    const dim = customAttributes.find(item => item.id === id);
    if (!dim) return [];
    if (dim.source) return [dim.source];
    const refs = [];
    for (const match of String(dim.caseExpr || '').matchAll(
        /\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/g)) refs.push(`${match[1]}.${match[2]}`);
    for (const match of String(dim.caseExpr || '').matchAll(
        /\[dimension:([a-zA-Z_][a-zA-Z0-9_]*)\]/g)) {
      const parent = customAttributes.find(item => item.lookmlName?.toLowerCase() === match[1]
        .toLowerCase() || lookmlIdentifier(item.name) === match[1].toLowerCase());
      if (parent) refs.push(...dimensionFieldRefs(parent.id, [...seen, id]))
    }
    return refs
  }

  function metricFieldRefs(id, seen = []) {
    if (seen.includes(id)) return [];
    const m = customMetrics.find(x => x.id === id);
    if (!m) return [];
    let refs = [];
    if (m.source) refs.push(m.source);
    if (m.kind === 'ratio') refs = refs.concat(metricFieldRefs(m.numerator, [...seen, id]),
      metricFieldRefs(m.denominator, [...seen, id]));
    if (m.formula) {
      for (const match of m.formula.matchAll(/\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/g)) refs.push(
        `${match[1]}.${match[2]}`);
      for (const match of m.formula.matchAll(/\[dimension:([a-zA-Z_][a-zA-Z0-9_]*)\]/g)) {
        const dim = customAttributes.find(item => item.lookmlName?.toLowerCase() === match[1]
          .toLowerCase() || lookmlIdentifier(item.name) === match[1].toLowerCase());
        if (dim) refs = refs.concat(dimensionFieldRefs(dim.id))
      }
      for (const match of m.formula.matchAll(/\{\{([^}]+)\}\}/g)) {
        const dep = customMetrics.find(x => x.id === match[1] || x.lookmlName === match[1] || x
          .label.toLowerCase() === match[1].trim().toLowerCase());
        if (dep) refs = refs.concat(metricFieldRefs(dep.id, [...seen, id]))
      }
    }
    return [...new Set(refs)]
  }

  function metricDependencyIds(id, seen = []) {
    if (seen.includes(id)) return [];
    const m = customMetrics.find(x => x.id === id);
    if (!m) return [];
    let ids = [id];
    if (m.kind === 'ratio') ids = ids.concat(metricDependencyIds(m.numerator, [...seen, id]),
      metricDependencyIds(m.denominator, [...seen, id]));
    if (m.formula)
      for (const match of m.formula.matchAll(/\{\{([^}]+)\}\}/g)) {
        const dep = customMetrics.find(x => x.id === match[1] || x.lookmlName === match[1] || x
          .label.toLowerCase() === match[1].trim().toLowerCase());
        if (dep) ids = ids.concat(metricDependencyIds(dep.id, [...seen, id]))
      }
    return [...new Set(ids)]
  }

  function baseDimension(dim) {
    return customAttributes.find(a => a.id === dim)?.base || dim
  }

  function dimensionAllowed(metric, dim) {
    return dim === 'none' || dim === 'date' || customAttributes.some(attribute => attribute.id ===
      dim)
  }

  function reportDateBucketStart(date, grain) {
    const d = reportDate(date);
    if (grain === 'year') return new Date(d.getFullYear(), 0, 1);
    if (grain === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    return grain === 'week' ? startOfWeek(d) : startOfLocalDay(d);
  }

  function reportDateBucketAt(start, grain, index) {
    const d = reportDateBucketStart(start, grain);
    if (grain === 'year') d.setFullYear(d.getFullYear() + Number(index));
    else if (grain === 'month') d.setMonth(d.getMonth() + Number(index));
    else d.setDate(d.getDate() + Number(index) * (grain === 'week' ? 7 : 1));
    return d;
  }

  function reportDateBucketIndex(date, range, grain) {
    const d = reportDate(date),
      start = reportDateBucketStart(range.start, grain);
    if (grain === 'year') return d.getFullYear() - start.getFullYear();
    if (grain === 'month') return (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() -
      start.getMonth();
    const dayOffset = (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(start
      .getFullYear(), start.getMonth(), start.getDate())) / 86400000;
    return Math.floor(dayOffset / (grain === 'week' ? 7 : 1));
  }

  function formatReportDate(d, grain, index) {
    const x = reportDateBucketAt(d, grain, index);
    if (grain === 'year') return String(x.getFullYear());
    if (grain === 'month') return x.toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric'
    });
    if (grain === 'week') return `Week ${localDateKey(x)} – ${localDateKey(addLocalDays(x,6))}`;
    return localDateKey(x);
  }

  function htmlEscape(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(
      /"/g, '&quot;')
  }

  function betaFraction(a, b, x) {
    let qab = a + b,
      qap = a + 1,
      qam = a - 1,
      c = 1,
      d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 100; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 3e-7) break
    }
    return h
  }

  function logGamma(z) {
    const c = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
      12.507343278686905, -.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7
    ];
    if (z < .5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = .9999999999998099;
    for (let i = 0; i < c.length; i++) x += c[i] / (z + i + 1);
    const t = z + c.length - .5;
    return .5 * Math.log(2 * Math.PI) + (z + .5) * Math.log(t) - t + Math.log(x)
  }

  function betaI(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b *
      Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? front * betaFraction(a, b, x) / a : 1 - front *
      betaFraction(b, a, 1 - x) / b
  }

  function welchPValue(left, right) {
    const a = left.filter(Number.isFinite),
      b = right.filter(Number.isFinite);
    if (a.length < 2 || b.length < 2) return null;
    const mean = x => x.reduce((s, v) => s + v, 0) / x.length,
      variance = x => x.reduce((s, v) => s + (v - mean(x)) ** 2, 0) / (x.length - 1),
      va = variance(a),
      vb = variance(b),
      se = Math.sqrt(va / a.length + vb / b.length);
    if (!se) return 1;
    const t = (mean(a) - mean(b)) / se,
      df = (va / a.length + vb / b.length) ** 2 / ((va / a.length) ** 2 / (a.length - 1) + (vb / b
        .length) ** 2 / (b.length - 1)),
      x = df / (df + t * t);
    return Math.max(0, Math.min(1, betaI(x, df / 2, .5)))
  }

  function proportionPValue(left, right) {
    const a = left.filter(Number.isFinite).map(v => Math.max(0, Math.min(1, v / 100))),
      b = right.filter(Number.isFinite).map(v => Math.max(0, Math.min(1, v / 100)));
    if (!a.length || !b.length) return null;
    const p1 = a.reduce((x, y) => x + y, 0) / a.length,
      p2 = b.reduce((x, y) => x + y, 0) / b.length,
      p = (p1 * a.length + p2 * b.length) / (a.length + b.length),
      se = Math.sqrt(p * (1 - p) * (1 / a.length + 1 / b.length));
    if (!se) return p1 === p2 ? 1 : 0;
    const z = Math.abs(p1 - p2) / se,
      t = 1 / (1 + .2316419 * z),
      d = .3989423 * Math.exp(-z * z / 2),
      tail = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t *
        1.330274))));
    return Math.max(0, Math.min(1, 2 * tail))
  }
  const reportRunTokens = new Map();
  let moduleResizeState = null;
  const REPORT_CHART_PALETTE = ['#302f2b', '#d5c4a3', '#6b675f', '#b18b4c', '#4c4a45', '#e6dfd0',
    '#806337', '#b3aaa0', '#514d43', '#c5ae85', '#8d897c', '#f0e6d2'
  ];

  function colorHexToHsl(hex) {
    const raw = String(hex || '#4e2a84').replace('#', ''),
      r = parseInt(raw.slice(0, 2), 16) / 255,
      g = parseInt(raw.slice(2, 4), 16) / 255,
      b = parseInt(raw.slice(4, 6), 16) / 255,
      max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      delta = max - min;
    let h = 0,
      sat = 0,
      l = (max + min) / 2;
    if (delta) {
      sat = delta / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360
    }
    return [h, sat, l]
  }

  function colorHslToHex(h, sat, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * sat,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60)[r, g, b] = [c, x, 0];
    else if (h < 120)[r, g, b] = [x, c, 0];
    else if (h < 180)[r, g, b] = [0, c, x];
    else if (h < 240)[r, g, b] = [0, x, c];
    else if (h < 300)[r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join(
      '')
  }

  const REPORT_PASTEL_PALETTES = [
    ['linen', 'Vanilla Linen', [40, 28, 48, 15, 65, 35, 5, 80]],
    ['rosewater', 'Rosewater', [345, 325, 8, 355, 310, 20, 335, 0]],
    ['lavender', 'Lavender Mist', [265, 285, 245, 305, 255, 275, 235, 295]],
    ['mint', 'Mint Garden', [150, 175, 125, 160, 185, 135, 165, 145]],
    ['sky', 'Soft Sky', [205, 225, 185, 215, 240, 195, 220, 200]],
    ['peach', 'Peach Sorbet', [22, 42, 5, 32, 55, 15, 37, 0]],
    ['lilac', 'Lilac Bloom', [285, 315, 255, 300, 330, 270, 310, 250]],
    ['sage', 'Sage Meadow', [105, 135, 75, 120, 155, 90, 140, 65]],
    ['buttercream', 'Buttercream', [48, 65, 30, 55, 80, 38, 70, 22]],
    ['seafoam', 'Seafoam', [170, 195, 145, 185, 210, 155, 200, 135]],
    ['blush', 'Blush & Cream', [350, 35, 325, 50, 10, 65, 340, 25]],
    ['wisteria', 'Wisteria & Sky', [270, 205, 290, 225, 250, 190, 310, 215]],
    ['apricot', 'Apricot & Sage', [25, 110, 45, 135, 12, 90, 60, 145]],
    ['powder_blue', 'Powder Blue & Rose', [215, 345, 195, 325, 235, 5, 180, 310]],
    ['meadow', 'Meadow & Lilac', [120, 280, 95, 305, 145, 255, 75, 325]],
    ['sorbet', 'Pastel Sorbet', [15, 55, 145, 205, 275, 335, 95, 175]],
    ['macaron', 'Macaron Box', [335, 265, 195, 135, 55, 20, 300, 165]],
    ['coastal', 'Coastal Sand', [195, 40, 170, 65, 220, 25, 145, 80]],
    ['berry_cream', 'Berry Cream', [315, 350, 275, 20, 335, 55, 295, 160]],
    ['ocean_pearl', 'Ocean Pearl', [195, 225, 165, 45, 205, 255, 150, 15]],
    ['citrus_cloud', 'Citrus Cloud', [45, 85, 15, 160, 60, 105, 30, 205]],
    ['orchid_sand', 'Orchid Sand', [285, 35, 315, 65, 260, 15, 335, 110]],
    ['tea_rose', 'Tea Rose', [345, 115, 20, 145, 325, 75, 5, 175]],
    ['glacier', 'Glacier', [185, 220, 255, 145, 200, 235, 275, 55]],
    ['almond_blossom', 'Almond Blossom', [35, 335, 75, 290, 20, 355, 120, 265]],
    ['spring_rain', 'Spring Rain', [140, 200, 280, 45, 165, 220, 315, 95]],
    ['cocoa_rose', 'Cocoa Rose', [20, 345, 45, 310, 5, 65, 275, 160]],
    ['blueberry_milk', 'Blueberry Milk', [240, 275, 200, 335, 225, 295, 165, 45]],
    ['melon_lilac', 'Melon Lilac', [15, 285, 55, 165, 35, 315, 95, 205]],
    ['cedar_cloud', 'Cedar Cloud', [110, 35, 185, 300, 135, 65, 220, 325]],
    ['sunrise_mist', 'Sunrise Mist', [5, 45, 315, 205, 25, 75, 275, 165]],
    ['lagoon_peach', 'Lagoon Peach', [170, 25, 205, 55, 145, 5, 235, 325]],
    ['violet_oat', 'Violet Oat', [265, 45, 300, 85, 245, 15, 335, 155]],
    ['petal_dew', 'Petal Dew', [330, 155, 55, 215, 350, 130, 25, 275]],
    ['desert_sky', 'Desert Sky', [25, 210, 65, 260, 5, 185, 95, 315]],
    ['plum_pistachio', 'Plum Pistachio', [290, 95, 335, 155, 265, 65, 15, 205]],
    ['seaside_floral', 'Seaside Floral', [200, 340, 135, 45, 225, 305, 165, 15]],
    ['cherry_vanilla', 'Cherry Vanilla', [350, 50, 315, 130, 10, 80, 275, 190]]
  ].map(([id, name, hues]) => ({
    id,
    name,
    colors: hues.map((h, index) => colorHslToHex(h, .62 + (index % 3) * .08, [.36, .55, .43,
      .62, .32, .51, .40, .58
    ][index]))
  }));

  function reportPaletteForChoice(id) {
    const preset = REPORT_PASTEL_PALETTES.find(item => item.id === id) || REPORT_PASTEL_PALETTES[
      0];
    const palette = [...preset.colors],
      used = new Set(palette);
    for (let index = 0; palette.length < 256; index++) {
      const [h, sat] = colorHexToHsl(preset.colors[index % preset.colors.length]);
      const lightness = .30 + ((index * .61803398875) % 1) * .34;
      const color = colorHslToHex(h + (index % 5 - 2) * 3, sat, lightness);
      if (!used.has(color)) {
        used.add(color);
        palette.push(color);
      }
    }
    palette.assignments = new Map();
    return palette;
  }

  function reportPaletteSwatches(id) {
    const preset = REPORT_PASTEL_PALETTES.find(item => item.id === id) || REPORT_PASTEL_PALETTES[
      0];
    return `<span class="palette-color-strip" aria-hidden="true">${preset.colors.map(color => `<i style="background:${color}"></i>`).join('')}</span>`;
  }

  function renderPalettePicker(id) {
    const preset = REPORT_PASTEL_PALETTES.find(p => p.id === id) || REPORT_PASTEL_PALETTES[0];
    return `<div class="report-control palette-control"><span>Color Palette</span><details class="palette-picker"><summary aria-label="Choose chart color palette"><span class="palette-choice-current">${reportPaletteSwatches(preset.id)}<span>${htmlEscape(preset.name)}</span></span></summary><div class="palette-picker-options" role="group" aria-label="Color palettes">${REPORT_PASTEL_PALETTES.map(p=>`<button type="button" data-palette-choice="${p.id}" aria-pressed="${p.id===preset.id}">${reportPaletteSwatches(p.id)}<span>${htmlEscape(p.name)}</span></button>`).join('')}</div></details><select data-module-setting="paletteId" aria-label="Chart color palette" hidden>${REPORT_PASTEL_PALETTES.map(p=>`<option value="${p.id}"${p.id===preset.id?' selected':''}>${htmlEscape(p.name)}</option>`).join('')}</select></div>`;
  }

  function reportSeriesColor(key, palette = REPORT_CHART_PALETTE) {
    if (!palette.assignments) palette.assignments = new Map();
    if (!palette.assignments.has(key)) palette.assignments.set(key, palette.assignments.size);
    return palette[palette.assignments.get(key) % palette.length];
  }

  function isReportDateField(id) {
    const field = customAttributes.find(f => f.id === id);
    return id === 'date' || field?.type === 'date' || !!field?.datePart ||
      /^\s*(?:DATE|TIMESTAMP|YEAR|MONTH|WEEK|DAY|QUARTER|DATE_TRUNC)\s*\(/i.test(field
        ?.caseExpr ||
        '') || (field?.source && fieldType(...field.source.split('.')) === 'date');
  }

  function isFullDateDimension(id) {
    if (id === 'date') return true;
    const item = customAttributes.find(a => a.id === id);
    if (!item || item.type !== 'date' || item.datePart) return false;
    if (item.source) return fieldType(...item.source.split('.')) === 'date';
    const expression = String(item.caseExpr || '').trim();
    return !!expression && !/\b(?:year|month|day|week|quarter|date_trunc)\s*\(/i.test(expression)
  }

  function axisPlan(config) {
    const axes = [config.xFields || [], config.yFields || []],
      fields = axes.flat(),
      measures = [...new Set(fields.filter(f => f.kind === 'metric' && customMetrics.some(m => m
        .id === f.id)).map(f => f.id))],
      facetDims = [],
      seriesDims = [];
    for (const axisFields of axes) {
      const firstMetric = axisFields.findIndex(f => f.kind === 'metric');
      if (firstMetric < 0) continue;
      const dimension = axisFields.find(field => field.kind === 'dimension' && customAttributes
        .some(a => a.id === field.id));
      if (!dimension) continue;
      (axisFields.indexOf(dimension) < firstMetric ? facetDims : seriesDims).push(dimension.id)
    }
    const dimensions = [...new Set(fields.filter(f => f.kind === 'dimension' && customAttributes
        .some(a => a.id === f.id)).map(f => f.id))],
      classified = new Set([...facetDims, ...seriesDims]),
      categoryDims = [...new Set(dimensions.filter(id => !classified.has(id)))];
    if (!categoryDims.length) categoryDims.push('none');
    const orderedUnique = items => [...new Set(items)];
    return {
      metrics: orderedUnique(measures.length ? measures : (config.metrics || []).filter(id =>
        customMetrics.some(m => m.id === id))),
      categoryDims,
      facetDims: orderedUnique(facetDims),
      seriesDims: orderedUnique(seriesDims),
      valueAxis: config.flipAxis ? 'x' : 'y'
    }
  }

  function mergeHierarchyLabels(paths) {
    return paths.map(path => path.join(' · '))
  }
  // Report aggregation and chart rendering
  async function buildReport(config, widget, runToken) {
    config = JSON.parse(JSON.stringify(config));
    normalizeDateFilters(config);
    const reportFormat = (value, id) => analysisFormat(value, id, config);
    if (['change', 'change_percent'].includes(config.tableCalculation) && (!config.compare ||
        config.compare === 'none')) {
      widget.querySelector('.widget-status').textContent =
        'Choose a comparison period for period-change calculations.';
      return;
    }
    config.resolvedParameters = config.useCapturedParameters ? config.resolvedParameters :
      Object.fromEntries(reportParameters.map(p => [p.name,
        parameterValue(p, {
          ...activeSheet().parameterValues,
          ...config.parameterValues
        })
      ]));
    if (config.selectedMetric && customMetrics.some(m => m.id === config.selectedMetric)) {
      let replaced = false;
      for (const axis of ['xFields', 'yFields']) config[axis] = (config[axis] || []).flatMap(
        f => f.kind !== 'metric' ? [f] : replaced ? [] : (replaced = true, [{
          ...f,
          id: config.selectedMetric
        }]));
    }
    if (!config.useCapturedParameters) {
      config.filters = (config.filters || []).filter(f => !f.transientCrossFilter);
      const cross = activeSheet().crossFilter;
      if (cross && cross.source !== widget.dataset.widgetId) config.filters = [...(config
        .filters || []), {
        ...cross,
        transientCrossFilter: true
      }];
    }
    const reportState = appState;
    if (!tables || !reportState) {
      widget.querySelector('.widget-status').textContent =
        'Generate a dataset first, then build a report.';
      return
    }
    const sheet = activeSheet(),
      moduleFilters = config.filters || [],
      plan = axisPlan(config),
      metrics = plan.metrics,
      metric = metrics[0] || config.metric,
      categoryDims = plan.categoryDims,
      visibleCategoryDims = categoryDims,
      facetDims = plan.facetDims,
      seriesDims = plan.seriesDims,
      axis = visibleCategoryDims[0] || 'date',
      dateAxis = visibleCategoryDims.length === 1 && isFullDateDimension(axis),
      requiredIds = [...metrics, ...(config.thresholdEnabled && config.thresholdMetric ? [config
        .thresholdMetric
      ] : [])],
      requiredCustom = new Set(requiredIds.flatMap(m => metricDependencyIds(m))),
      requiredMetrics = customMetrics.filter(m => requiredCustom.has(m.id)),
      requiredMetricSpecs = new Map(requiredMetrics.map(m => [m.id, {
        refs: metricFieldRefs(m.id),
        factTable: ReportingTools.lineage(m, customMetrics, customAttributes).fact
      }]));
    const requiredFactTables = new Set(requiredMetrics.map(item => requiredMetricSpecs.get(item
      .id)?.factTable).filter(Boolean));
    config.metrics = metrics;
    config.axis = axis;
    config.flipAxis = plan.valueAxis === 'x';
    delete config.drillLevel;
    if (!metrics.length) {
      widget.querySelector('.widget-status').textContent =
        'Choose at least one metric for this module.';
      return
    }
    if (config.chartType === 'combo' && metrics.length < 2) {
      widget.querySelector('.widget-content').innerHTML =
        '<div class="widget-empty">Bar+Line needs at least two measures: the first is plotted as bars and the second as a line.</div>';
      widget.querySelector('.widget-status').textContent =
        'Add a second measure to the X or Y Axis.';
      return
    }
    if (config.chartType === 'calendar_heatmap' && !dateAxis) {
      widget.querySelector('.widget-content').innerHTML =
        '<div class="widget-empty">Calendar Heatmap needs a full Date dimension on an axis.</div>';
      widget.querySelector('.widget-status').textContent =
        'Add a full Date dimension to an axis, then refresh.';
      return
    }
    if (metrics.some(m => [...visibleCategoryDims, ...seriesDims].some(dim => !dimensionAllowed(
        m, dim)))) {
      widget.querySelector('.widget-status').textContent =
        'Marketing cost metrics can only be grouped by date, campaign source, or campaign name.';
      return
    }
    const planIssues = validateReportPlan(config, metrics);
    if (planIssues.length) {
      widget.querySelector('.widget-status').textContent = 'Incompatible report: ' + planIssues
        .join(' ');
      widget.querySelector('.widget-content').innerHTML = '<div class="widget-empty">' +
        htmlEscape(planIssues.join(' ')) + '</div>';
      return;
    }
    let current, comparison;
    try {
      current = moduleReportRange(config);
      comparison = getComparisonRange(current, config)
    } catch (e) {
      widget.querySelector('.widget-status').textContent = e.message;
      return
    }
    const grainChoice = config.chartType === 'calendar_heatmap' ? 'day' : (dateAxis ? config
        .dateDrillLevel || 'day' : config.grain || 'auto'),
      grain = grainChoice === 'auto' ? (current.days <= 45 ? 'day' : current.days <= 370 ?
        'week' : 'month') : grainChoice;
    const periods = [{
      id: 0,
      label: 'Selected period',
      range: current
    }];
    if (comparison) periods.push({
      id: 1,
      label: 'Comparison period',
      range: comparison
    });
    const cacheKey = aggregateCacheKey(config),
      cachedAggregates = reportDisplayOverrides.get(widget.dataset.widgetId) ||
      reportAggregateCache.get(cacheKey);
    widget.dataset.aggregateCacheHit = String(!!cachedAggregates);
    if (cachedAggregates) studioPerformance.aggregateCacheHits++;
    const buckets = cachedAggregates?.buckets || new Map(),
      totals = cachedAggregates?.totals || new Map(),
      usersById = new Map(),
      lifetimeByUser = new Map(),
      plansByUser = new Map(),
      sampleRecords = cachedAggregates?.sampleRecords || [],
      reportedFormulaErrors = cachedAggregates?.reportedFormulaErrors || new Map();
    if (!cachedAggregates)
      for (const p of periods) totals.set(p.id, createReportBucket());
    const inRange = (date, range) => {
      if (!date) return false;
      const key = localDateKey(date);
      return key >= localDateKey(range.start) && key <= localDateKey(range.end)
    };
    const bucketIndex = (date, range) => reportDateBucketIndex(date, range, grain);
    const preparedDateFilters = normalizeDateFilters(config).filter(filter => filter.role !==
      'event' && filter.enabled).map(filter => ({
      ...filter,
      resolvedRange: getReportRange(filter.range)
    }));
    const inspection = cachedAggregates?.inspection ? {
      ...cachedAggregates.inspection,
      cached: true,
      filters: cachedAggregates.inspection.filters.map(filter => ({
        ...filter
      })),
      generateMs: 0,
      aggregateMs: 0,
      renderMs: 0
    } : {
      scanned: 0,
      eligible: 0,
      eventDateExcluded: 0,
      accepted: 0,
      groups: 0,
      generateMs: 0,
      aggregateMs: 0,
      renderMs: 0,
      cached: false,
      filters: [...moduleFilters.map(filter => ({
        name: dimensionLabel(filter.dimension),
        excluded: 0
      })), ...preparedDateFilters.map(filter => ({
        name: dimensionLabel(filter.dimension) + ' date',
        excluded: 0
      }))]
    };
    let aggregationStarted = performance.now();
    const calculateEvent = (date, user, plan, updates, rowMap = {}) => {
      inspection.scanned++;
      rowMap.__parameters = config.resolvedParameters || {};
      if (!date || !requiredFactTables.has(rowMap.__factTable)) return;
      inspection.eligible++;
      const d = reportDate(date),
        dateKey = localDateKey(date);
      const axisDateValue = dateAxis && axis !== 'date' ? dimensionValue(axis, user, plan, d,
        rowMap) : d;
      let matchingPeriods = periods.filter(period => !dateAxis || (axisDateValue && inRange(
        axisDateValue, period.range)));
      if (periods.length > 1 && !dateAxis && !preparedDateFilters.length) matchingPeriods =
        matchingPeriods.filter(p => inRange(d, p.range));
      if (!matchingPeriods.length) {
        inspection.eventDateExcluded++;
        return;
      }
      for (let index = 0; index < moduleFilters.length; index++) {
        const filter = moduleFilters[index];
        if (filter.dimension && !matchesFilter(filter, user, plan, d, rowMap)) {
          inspection.filters[index].excluded++;
          return;
        }
      }
      for (let index = 0; index < preparedDateFilters.length; index++) {
        const filter = preparedDateFilters[index],
          raw = dimensionValue(filter.dimension, user, plan, d, rowMap);
        matchingPeriods = matchingPeriods.filter(period => {
          const offset = period.id === 0 ? 0 : Math.round((period.range.start - current
            .start) / 86400000);
          const primary = localDateKey(filter.resolvedRange.start) === localDateKey(
            current.start) && localDateKey(filter.resolvedRange.end) === localDateKey(
            current.end);
          const range = period.id === 0 ? filter.resolvedRange : primary ? period.range :
          {
            start: addLocalDays(filter.resolvedRange.start, offset),
            end: addLocalDays(filter.resolvedRange.end, offset)
          };
          return raw && raw !== '(Unknown)' && inRange(reportDate(raw), range);
        });
        if (!matchingPeriods.length) {
          inspection.filters[moduleFilters.length + index].excluded++;
          return;
        }
      }
      inspection.accepted++;
      const computed = {};
      for (const m of requiredMetrics) {
        try {
          const refs = requiredMetricSpecs.get(m.id).refs,
            sourceTable = requiredMetricSpecs.get(m.id).factTable,
            isSourceRow = rowMap.__factTable === sourceTable && refs.every(ref => {
              const [table, column] = ref.split('.');
              return (rowMap?.[table] === null && table !== sourceTable && (ReportingTools
                .joins[sourceTable] || []).includes(table)) || (rowMap?.[table] != null &&
                Object.prototype.hasOwnProperty.call(rowMap[table], column))
            });
          if (m.kind === 'column') {
            const raw = rawField(m.source, rowMap);
            computed[m.id] = isSourceRow && (raw !== '' && raw != null) ? ['count',
              'count_distinct'
            ].includes(m.aggregation) ? String(raw) : Number(raw) : null
          } else if (m.formula) computed[m.id] = isSourceRow ? evaluateFormula(m.formula,
            rowMap, [m.id]) : null
        } catch (e) {
          computed[m.id] = null;
          if (!reportedFormulaErrors.has(m.id)) {
            reportedFormulaErrors.set(m.id, e.message || String(e));
            console.warn(`Measure formula failed (${m.lookmlName||m.label}):`, e)
          }
        }
      }
      for (const id of Object.keys(computed))
        if (computed[id] == null) delete computed[id];
      const fact = rowMap.__factTable,
        recordId = ReportingTools.recordIdentity(fact, rowMap);
      matchingPeriods.forEach(p => {
        const axisDate = dateAxis && axis !== 'date' ? dimensionValue(axis, user, plan, d,
            rowMap) : d,
          x = dateAxis ? String(bucketIndex(axisDate, p.range)) : visibleCategoryDims.map(
            dim => dim === 'date' ? String(bucketIndex(d, p.range)) : dimensionValue(dim,
              user, plan, d, rowMap)).join('\u001e'),
          s = seriesDims.length ? seriesDims.map(dim => dimensionDisplayValue(dim, user,
            plan, d, rowMap)).join(' · ') : 'All',
          f = facetDims.length ? facetDims.map(dim => dimensionDisplayValue(dim, user,
            plan, d, rowMap)).join(' · ') : 'All',
          key = `${p.id}\u001f${f}\u001f${x}\u001f${s}`;
        let b = buckets.get(key);
        if (!b) {
          b = createReportBucket();
          b.period = p.id;
          b.x = x;
          b.series = s;
          b.facet = f;
          b.fieldValues = Object.fromEntries([...visibleCategoryDims, ...seriesDims, ...
            facetDims
          ].map(id => [id, dimensionValue(id, user, plan, d, rowMap)]));
          buckets.set(key, b)
        }
        const t = totals.get(p.id);
        for (const target of [b, t]) {
          if (!addUniqueReportRecord(target, fact, recordId, computed, requiredMetrics,
              target === t)) continue;
          for (const [field, value] of Object.entries(updates)) target[field] += value;
        }
      });
    };
    let aggregationJob = null,
      pendingReportEvents = [],
      outsideSourceScanned = 0;
    const calculationColumns = new Map(),
      slimRowCache = new WeakMap(),
      calculationRefs = [...requiredMetrics.flatMap(item => requiredMetricSpecs.get(item.id)
          .refs), ...[...visibleCategoryDims, ...facetDims, ...seriesDims, ...moduleFilters.map(
          filter => filter.dimension), ...preparedDateFilters.map(filter => filter.dimension)]
        .flatMap(id => dimensionFieldRefs(id))
      ];
    const requiredGenerationTables = new Set([...requiredFactTables, ...calculationRefs.map(
      reference => reference.split('.')[0])]);
    for (const reference of calculationRefs) {
      const [table, column] = reference.split('.');
      if (!calculationColumns.has(table)) calculationColumns.set(table, new Set());
      calculationColumns.get(table).add(column)
    }
    for (const table of requiredFactTables) {
      if (!calculationColumns.has(table)) calculationColumns.set(table, new Set());
      for (const column of ReportingTools.identityFields[table] || []) calculationColumns.get(
        table).add(column);
      for (const column of COLUMNS[table] || [])
        if (
          /^(user_id|subscription_id|transaction_id|schedule_id|subscription_start_ts|transaction_ts|date|subscription_status|subscription_type|subscription_length|gross_amount|net_amount)$/
          .test(column)) calculationColumns.get(table).add(column);
    }
    const slimRows = rowMap => {
      const selected = {
        __factTable: rowMap.__factTable
      };
      for (const [table, columns] of calculationColumns) {
        const row = rowMap[table];
        if (!row) {
          if (row === null) selected[table] = null;
          continue;
        }
        let slim = slimRowCache.get(row);
        if (!slim) {
          slim = {};
          for (const column of columns)
            if (Object.prototype.hasOwnProperty.call(row, column)) slim[column] = row[column];
          slimRowCache.set(row, slim)
        }
        selected[table] = slim
      }
      return selected
    };
    const addEvent = (...event) => {
      if (aggregationJob) {
        if (!requiredFactTables.has(event[4]?.__factTable)) {
          outsideSourceScanned++;
          return
        }
        const rowMap = slimRows(event[4]);
        pendingReportEvents.push([event[0], rowMap.user_records || null, event[2], event[3],
          rowMap
        ])
      } else {
        const before = inspection.accepted;
        calculateEvent(...event);
        if (sampleRecords.length < 200 && inspection.accepted > before) sampleRecords.push(
          event[4]);
      }
    };
    const flushReportEvents = async (final = false) => {
      if (!aggregationJob) return;
      const response = await aggregationRequest('push', {
        job: aggregationJob,
        events: pendingReportEvents.splice(0),
        final
      });
      if (!response) throw new Error(
        'Calculation worker unavailable. Recalculate to retry locally.');
      inspection.aggregateMs += response.computeMs;
      if (final) {
        sampleRecords.push(...(response.sampleRecords || []));
        buckets.clear();
        for (const [key, value] of response.buckets) buckets.set(key, value);
        totals.clear();
        for (const [key, value] of response.totals) totals.set(key, value);
        for (const [key, value] of response.reportedFormulaErrors) reportedFormulaErrors
          .set(key, value);
        const {
          generateMs,
          aggregateMs
        } = inspection;
        Object.assign(inspection, response.inspection, {
          scanned: response.inspection.scanned + outsideSourceScanned,
          generateMs,
          aggregateMs,
          worker: true
        });
      }
    };
    const statusNode = widget.querySelector('.widget-status');
    if (!cachedAggregates) {
      if (getReportAggregationWorker()) {
        aggregationJob = widget.dataset.widgetId + ':' + runToken;
        const spec = {
          config,
          current,
          grain,
          axis,
          dateAxis,
          visibleCategoryDims,
          seriesDims,
          facetDims,
          moduleFilters,
          preparedDateFilters,
          requiredMetrics,
          periods,
          requiredFactTables: [...requiredFactTables],
          requiredMetricSpecs: [...requiredMetricSpecs],
          customMetrics,
          customAttributes,
          inspection: {
            ...inspection,
            filters: inspection.filters.map(filter => ({
              ...filter
            }))
          }
        };
        await aggregationRequest('open', {
          job: aggregationJob,
          spec,
          source: calculateEvent.toString()
        });
      }
      const previousOptions = generationOptions;
      try {
        rng = seeded((reportState.masterSeed ^ 0x4d41524b) >>> 0);
        if (!reportState.marketingRows) reportState.marketingRows = makeMarketing(reportState
          .now, reportState.campaign).rows;
        const market = reportState.marketingRows;
        for (const row of market) {
          addEvent(row.date, {
            campaign_source: row.campaign_source,
            campaign_name: row.campaign_name
          }, null, {
            marketingSpend: Number(row.cost) || 0
          }, {
            __factTable: 'marketing_records',
            marketing_records: row
          })
        }
        const totalBatches = Math.ceil(reportState.count / reportState.batchSize),
          scheduleTable = 'scheduled_subscription_payment_records',
          selectedDims = [...visibleCategoryDims, ...facetDims, ...seriesDims, ...moduleFilters
            .map(f => f.dimension), ...(config.dateFilterDimensions || [])
          ],
          needsSchedule = requiredFactTables.has(scheduleTable) || selectedDims.some(id => {
            const d = customAttributes.find(a => a.id === id);
            return d?.source?.startsWith(scheduleTable + '.') || d?.caseExpr?.includes(
              scheduleTable + '.')
          }) || metrics.flatMap(m => metricFieldRefs(m)).some(ref => ref.startsWith(
            scheduleTable + '.'));
        for (let batch = 0; batch < totalBatches; batch++) {
          if (reportRunTokens.get(widget.dataset.widgetId) !== runToken) {
            statusNode.textContent = 'Refresh cancelled.';
            return
          }
          const batchWaitStarted = performance.now();
          const batchResult = await reportBatch(reportState, batch, needsSchedule,
            requiredGenerationTables);
          inspection.generateMs += performance.now() - batchWaitStarted;
          if (reportRunTokens.get(widget.dataset.widgetId) !== runToken) return;
          const data = batchResult.data,
            userMap = new Map(data.user_records.map(u => [String(u.user_id), u])),
            subMap = new Map(data.subscription_records.map(sub => [String(sub.subscription_id),
              sub
            ])),
            transactionMap = new Map(data.transaction_records.map(tx => [String(tx
              .transaction_id), tx]));
          if (needsSchedule)
            for (const [row, u, sub] of batchResult.scheduleEvents) addEvent(row
              .scheduled_payment_ts, userMap.get(String(row.user_id)) || u, (subMap.get(
                String(row.subscription_id)) || sub)?.subscription_length, {}, {
                __factTable: scheduleTable,
                [scheduleTable]: row,
                user_records: userMap.get(String(row.user_id)) || u,
                subscription_records: subMap.get(String(row.subscription_id)) || sub,
                transaction_records: row.transaction_id !== '' && row.transaction_id != null ?
                  transactionMap.get(String(row.transaction_id)) || null : null
              });
          data.subscription_records.forEach(s => {
            subMap.set(String(s.subscription_id), s);
            plansByUser.set(String(s.user_id), s.subscription_length)
          });
          data.user_records.forEach(u => usersById.set(String(u.user_id), u));
          for (const tx of data.transaction_records) {
            const uid = String(tx.user_id),
              u = userMap.get(uid),
              sub = subMap.get(String(tx.subscription_id)),
              date = tx.transaction_ts,
              kind = tx.transaction_type,
              net = Number(tx.net_amount) || 0,
              refund = Number(tx.refund_amount) || 0,
              chargeback = Number(tx.chargeback_amount) || 0;
            if (requiredFactTables.has('user_lifetime')) lifetimeByUser.set(uid, (lifetimeByUser
              .get(uid) || 0) + net);
            const isRefund = ['downgrade_refund', 'general_refund'].includes(kind),
              updates = {
                transactions: 1,
                net,
                discount: -Number(tx.discount_amount || 0),
                tax: isRefund ? Math.abs(Number(tx.tax_amount) || 0) : Number(tx.tax_amount) ||
                  0
              };
            if (CHARGE_TYPES.has(kind)) updates.gross = Number(tx.gross_amount) || 0;
            if (refund < 0) updates.refund = Math.abs(refund) + Math.abs(Number(tx
              .tax_amount) || 0);
            if (chargeback < 0) updates.chargeback = Math.abs(chargeback);
            addEvent(date, u, sub?.subscription_length, updates, {
              __factTable: 'transaction_records',
              transaction_records: tx,
              user_records: u,
              subscription_records: sub
            })
          }
          for (const u of data.user_records) addEvent(u.signup_ts, u, plansByUser.get(String(u
            .user_id)), {
            newUsers: 1
          }, {
            __factTable: 'user_records',
            user_records: u
          });
          for (const s of data.subscription_records) {
            const u = userMap.get(String(s.user_id));
            if (s.subscription_type === 'new_subscription') addEvent(s.subscription_start_ts, u,
              s.subscription_length, {
                newSubscriptions: 1
              }, {
                __factTable: 'subscription_records',
                subscription_records: s,
                user_records: u
              });
            if (s.subscription_type === 'reactivation') addEvent(s.subscription_start_ts, u, s
              .subscription_length, {
                reactivations: 1
              }, {
                __factTable: 'subscription_records',
                subscription_records: s,
                user_records: u
              })
          }
          for (const c of data.subscription_change_records) {
            const u = userMap.get(String(c.user_id)),
              sub = subMap.get(String(c.subscription_id));
            addEvent(c.change_ts, u, c.subscription_length, {
              upgrades: c.change_reason === 'upgrade' ? 1 : 0,
              downgrades: c.change_reason === 'downgrade' ? 1 : 0
            }, {
              __factTable: 'subscription_change_records',
              subscription_change_records: c,
              user_records: u,
              subscription_records: sub
            });
          }
          for (const f of data.failed_transactions) {
            const u = userMap.get(String(f.user_id)),
              sub = subMap.get(String(f.subscription_id));
            addEvent(f.update_ts, u, sub?.subscription_length, {
              failed: 1
            }, {
              __factTable: 'failed_transactions',
              failed_transactions: f,
              user_records: u,
              subscription_records: sub
            })
          }
          await flushReportEvents();
          if (sharedReportSession?.runId === reportState.runId) {
            const session = sharedReportSession,
              done = (session.completed.get(batch) || 0) + 1;
            session.completed.set(batch, done);
            if (done >= session.participants) {
              session.batches.delete(batch);
              session.completed.delete(batch)
            }
          }
          if (batch % 10 === 0) {
            statusNode.textContent = `Processing data · batch ${batch+1} of ${totalBatches}…`;
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
        if (requiredFactTables.has('user_lifetime'))
          for (const [uid, u] of usersById) {
            const lifetime = lifetimeByUser.get(uid) || 0;
            addEvent(u.signup_ts, u, plansByUser.get(uid), {
              ltvTotal: lifetime,
              ltvUsers: 1
            }, {
              __factTable: 'user_lifetime',
              user_records: u
            })
          }
        await flushReportEvents(true);
      } finally {
        if (aggregationJob) void aggregationRequest('cancel', {
          job: aggregationJob
        }).catch(() => {});
        generationOptions = previousOptions
      }
      if (!aggregationJob) inspection.aggregateMs = performance.now() - aggregationStarted -
        inspection.generateMs;
      inspection.groups = buckets.size;
      for (const total of totals.values()) delete total.__uniqueRecordIds;
      retainReportAggregates(cacheKey, {
        sampleRecords,
        buckets,
        totals,
        reportedFormulaErrors,
        inspection: {
          ...inspection,
          filters: inspection.filters.map(filter => ({
            ...filter
          }))
        }
      });
    }
    for (const bucket of [...buckets.values(), ...totals.values()]) bucket.__parameters = config
      .resolvedParameters;
    reportDisplaySnapshots.set(widget.dataset.widgetId, {
      run: reportState.runId,
      revision: definitionRevision,
      config: JSON.parse(JSON.stringify(config)),
      aggregates: {
        sampleRecords,
        buckets,
        totals,
        reportedFormulaErrors,
        inspection
      },
      dateAxis: dateAxis ? axis : null,
      current,
      grain
    });
    const renderedWidget = activeSheet()?.widgets.find(item => item.id === widget.dataset
      .widgetId);
    if (renderedWidget) renderedWidget.lastCalculationInspection = inspection;
    inspection.groups = buckets.size;
    inspection.renderStarted = performance.now();
    let xKeys = dateAxis ? Array.from({
      length: reportDateBucketIndex(current.end, current, grain) + 1
    }, (_, i) => String(i)) : [...new Set([...buckets.values()].map(b => String(b.x)))].sort((
      a, b) => a.localeCompare(b, undefined, {
      numeric: true
    }));
    const visualKind = config.visual || config.chartType;
    let chartWarning = '';
    if (dateAxis && xKeys.length > 365 && visualKind !== 'spreadsheet') chartWarning =
      'More than 365 date points; choose a date grouping dimension for a clearer graph.';
    if (!dateAxis && !['spreadsheet', 'histogram'].includes(visualKind)) {
      const maxCats = Number(config.topN) > 0 ? Infinity : ['pie', 'donut'].includes(
          visualKind) ? 12 : visualKind === 'scatter' ?
        80 : ['heatmap',
          'treemap'
        ].includes(visualKind) ? 80 : visualKind === 'funnel' ? 20 : 40;
      if (xKeys.length > maxCats) {
        const rank = new Map();
        for (const b of buckets.values())
          if (b.period === 0) rank.set(String(b.x), (rank.get(String(b.x)) || 0) + Math.abs(
            metrics.reduce((sum, id) => sum + (Number(reportMetricValue(id, b)) || 0), 0)));
        xKeys.sort((a, b) => (rank.get(b) || 0) - (rank.get(a) || 0));
        xKeys = xKeys.slice(0, maxCats);
        chartWarning =
          `Showing the top ${maxCats} of ${rank.size} categories. Use a spreadsheet or add a filter to see all.`
      }
    }
    const fieldForDimension = id => [...(config.xFields || []), ...(config.yFields || [])].find(
        field => field.kind === 'dimension' && field.id === id),
      directionForDimension = id => fieldForDimension(id)?.sortDirection === 'descending' ? -1 :
      1;
    const compareDimensionValue = (left, right, id) => {
      const custom = customAttributes.find(item => item.id === id),
        source = custom?.source || '',
        sourceParts = source.split('.'),
        type = custom?.datePart ? 'number' : custom?.type === 'date' || (sourceParts
          .length === 2 && fieldType(...sourceParts) === 'date') ? 'date' : 'string';
      if (type === 'date') {
        const a = Date.parse(left),
          b = Date.parse(right);
        if (Number.isFinite(a) && Number.isFinite(b)) return a - b
      }
      if (type === 'number' || (String(left).trim() !== '' && String(right).trim() !== '' &&
          /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(String(left).trim()) &&
          /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(String(right).trim()))) {
        const a = Number(left),
          b = Number(right);
        if (Number.isFinite(a) && Number.isFinite(b)) return a - b
      }
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
          'august', 'september', 'october', 'november', 'december'
        ],
        weekNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
          'saturday'
        ],
        aText = String(left).toLowerCase(),
        bText = String(right).toLowerCase();
      if (monthNames.includes(aText) && monthNames.includes(bText)) return monthNames.indexOf(
        aText) - monthNames.indexOf(bText);
      if (weekNames.includes(aText) && weekNames.includes(bText)) return weekNames.indexOf(
        aText) - weekNames.indexOf(bText);
      return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    };
    const measureSortField = [...(config.xFields || []), ...(config.yFields || [])].find(
        field => field.kind === 'metric' && ['ascending', 'descending'].includes(field
          .sortDirection)),
      measureSortDirection = measureSortField?.sortDirection === 'descending' ? -1 : 1;
    const measureSortValue = x => {
      if (!measureSortField) return 0;
      let sum = 0,
        found = false;
      for (const bucket of buckets.values())
        if (bucket.period === 0 && String(bucket.x) === String(x)) {
          const value = reportMetricValue(measureSortField.id, bucket);
          if (Number.isFinite(value)) {
            sum += value;
            found = true
          }
        } return found ? sum : 0
    };
    const compareCategoryKeys = (left, right) => {
      if (dateAxis) {
        const dateId = visibleCategoryDims.find(id => isFullDateDimension(id)) ||
          visibleCategoryDims[0];
        return directionForDimension(dateId) * (Number(left) - Number(right))
      }
      const leftParts = String(left).split('\u001e'),
        rightParts = String(right).split('\u001e');
      for (let index = 0; index < visibleCategoryDims.length; index++) {
        const id = visibleCategoryDims[index],
          order = compareDimensionValue(leftParts[index] || '', rightParts[index] || '', id) *
          directionForDimension(id);
        if (order) return order
      }
      if (measureSortField) {
        const difference = (measureSortValue(left) - measureSortValue(right)) *
          measureSortDirection;
        if (difference) return difference
      }
      return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    };
    xKeys.sort(compareCategoryKeys);
    const displaySnapshot = reportDisplaySnapshots.get(widget.dataset.widgetId);
    if (displaySnapshot && dateAxis) displaySnapshot.dateBuckets = xKeys.map(index => {
      const start = reportDateBucketAt(current.start, grain, index);
      const end = addLocalDays(reportDateBucketAt(current.start, grain, Number(index) + 1),
        -1);
      return {
        start: localDateKey(start < current.start ? current.start : start),
        end: localDateKey(end > current.end ? current.end : end)
      };
    });
    if (Number(config.topN) > 0 && !dateAxis) {
      const scores = new Map(xKeys.map(x => [x, 0]));
      for (const b of buckets.values())
        if (b.period === 0) scores.set(String(b.x), (scores.get(String(b.x)) || 0) + Math.abs(
          Number(reportMetricValue(metrics[0], b)) || 0));
      const top = new Set([...xKeys].sort((a, b) => scores.get(b) - scores.get(a)).slice(0, Math
        .floor(Number(config.topN))));
      xKeys = xKeys.filter(x => top.has(x));
    }
    const rawPaths = xKeys.map(x => dateAxis ? [formatReportDate(current.start, grain, Number(
        x))] : String(x).split('\u001e')),
      hierarchyPaths = rawPaths.map(path => dateAxis ? path : path.map(value => String(value))),
      labels = hierarchyPaths.map(path => path.join(' · ')),
      displayLabels = mergeHierarchyLabels(hierarchyPaths);
    const compareNestedNames = (left, right, ids) => {
      const a = String(left).split(' · '),
        b = String(right).split(' · ');
      for (let index = 0; index < ids.length; index++) {
        const order = compareDimensionValue(a[index] || '', b[index] || '', ids[index]) *
          directionForDimension(ids[index]);
        if (order) return order
      }
      return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    };
    const facetNames = [...new Set([...buckets.values()].map(b => b.facet || 'All'))].sort((a,
        b) => compareNestedNames(a, b, facetDims)),
      seriesNames = [...new Set([...buckets.values()].map(b => b.series))].sort((a, b) =>
        compareNestedNames(a, b, seriesDims));
    const formulaIssues = [];
    for (const metricId of requiredCustom) {
      const definition = customMetrics.find(item => item.id === metricId);
      if (!definition?.formula || definition.tableMode === 'window' || !requiredMetricSpecs.get(
          metricId)?.factTable) continue;
      if (reportedFormulaErrors.has(metricId)) formulaIssues.push(
        `${definition.lookmlName||definition.label}: ${reportedFormulaErrors.get(metricId)}`);
      else if (inspection.accepted > 0 && !(totals.get(0)?.customAgg?.[metricId]?.count))
        formulaIssues.push(
          `${definition.lookmlName||definition.label}: matching source rows yielded no usable values; check source fields and NULL results`
        )
    }
    const formulaIssueText = formulaIssues.length ?
      `Formula issue${formulaIssues.length===1?'':'s'}: ${formulaIssues.join(' · ')}. Review the SQL in the Data Dictionary.` :
      '';
    if (formulaIssueText) {
      const definitionStatus = $('definitionStatus');
      if (definitionStatus) {
        definitionStatus.textContent = formulaIssueText;
        definitionStatus.classList.add('error')
      }
    }
    const chartSeries = [];
    for (const metricId of metrics)
      for (const facet of facetNames)
        for (const p of periods)
          for (const s of seriesNames) {
            const vals = xKeys.map(x => {
              const b = buckets.get(`${p.id}\u001f${facet}\u001f${x}\u001f${s}`);
              return b ? reportMetricValue(metricId, b) : null
            });
            if (vals.some(v => v != null && Number.isFinite(v))) chartSeries.push({
              label: [metrics.length > 1 ? metricMeta(metricId).label : '', comparison ? p
                .label : '', facetDims
                .length ? facet : '', seriesDims.length ? s : ''
              ].filter(Boolean).join(' · '),
              facet,
              seriesKey: s,
              periodKey: p.id,
              metricId,
              color: '',
              values: vals
            })
          }
    if (dateAxis && requiredIds.some(id => metricDependencyIds(id).some(dep => customMetrics
        .find(m => m.id === dep)?.tableMode === 'window'))) {
      for (const period of periods)
        for (const facet of facetNames)
          for (const series of seriesNames) {
            const template = [...buckets.values()].find(b => b.period === period.id && b
              .facet === facet && b.series === series);
            if (!template) continue;
            for (const x of (config.chartType === 'spreadsheet' ? xKeys.slice(0, 250) :
                xKeys)) {
              const key = `${period.id}\u001f${facet}\u001f${x}\u001f${series}`;
              if (!buckets.has(key)) {
                const b = createReportBucket();
                Object.assign(b, {
                  period: period.id,
                  facet,
                  series,
                  x,
                  fieldValues: {
                    ...template.fieldValues,
                    [axis]: localDateKey(reportDateBucketAt(period.range.start, grain,
                      Number(x)))
                  }
                });
                buckets.set(key, b);
              }
            }
          }
    }
    const windowDefinitions = applyReportTableCalculations(buckets, totals, config.chartType ===
      'spreadsheet' ? xKeys.slice(0, 250) : xKeys, requiredIds);
    if (windowDefinitions.length)
      for (const series of chartSeries) series.values = xKeys.map(x => {
        const bucket = buckets.get(
          `${series.periodKey}\u001f${series.facet}\u001f${x}\u001f${series.seriesKey}`);
        return bucket ? reportMetricValue(series.metricId, bucket) : null
      });
    transformReportSeries(chartSeries, config);
    chartSeries.forEach(s => {
      const pointParts = index => {
        const parts = [];
        visibleCategoryDims.filter(dim => dim !== 'none').forEach((dim, level) => parts
          .push(
            `${dimensionLabel(dim)}: ${hierarchyPaths[index]?.[level]??labels[index]??''}`
          ));
        facetDims.forEach((dim, level) => parts.push(
          `${dimensionLabel(dim)}: ${String(s.facet).split(' · ')[level]||''}`));
        seriesDims.forEach((dim, level) => parts.push(
          `${dimensionLabel(dim)}: ${String(s.seriesKey).split(' · ')[level]||''}`));
        if (comparison) parts.push(periods.find(period => period.id === s.periodKey)
          ?.label || '');
        return parts.filter(Boolean)
      };
      s.tooltipContext = [...(visibleCategoryDims.some(dim => dim !== 'none') ? [
        `${visibleCategoryDims.map(dimensionLabel).join(' / ')}: ${[...new Set(hierarchyPaths.map(path=>path.join(' · ')))].slice(0,5).join(', ')}${hierarchyPaths.length>5?'…':''}`
      ] : []), ...(facetDims.length ? [
        `${facetDims.map(dimensionLabel).join(' / ')}: ${s.facet}`
      ] : []), ...(seriesDims.length ? [
        `${seriesDims.map(dimensionLabel).join(' / ')}: ${s.seriesKey}`
      ] : []), ...(comparison ? [periods.find(period => period.id === s.periodKey)
        ?.label || ''
      ] : [])];
      s.tooltipPoints = s.values.map((value, index) => [...pointParts(index),
        `${metricMeta(s.metricId).label}: ${reportFormat(value,s.metricId)}`
      ].filter(Boolean).join('\n'))
    });
    const chartPalette = reportPaletteForChoice(config.paletteId);
    const plottedDimensions = [...new Set([...visibleCategoryDims.filter(id => id !== 'none'),
      ...facetDims, ...seriesDims
    ])];
    const dateReport = plottedDimensions.some(isReportDateField);
    const categoryColorDimension = !dateReport && !seriesDims.length && visibleCategoryDims
      .filter(id => id !==
        'none').length ? visibleCategoryDims.filter(id => id !== 'none').join('|') : null;
    const dimensionColorKey = (id, value) => `dimension:${id}:${value}`;
    const colorKeys = categoryColorDimension ? labels.map(value => dimensionColorKey(
        categoryColorDimension, value)) :
      chartSeries.map(s => dateReport ? `measure:${s.metricId}` : seriesDims.length ?
        dimensionColorKey(seriesDims[0], s.seriesKey) :
        facetDims.length ? dimensionColorKey(facetDims[0], s.facet) : `measure:${s.metricId}`);
    [...new Set(colorKeys)].sort((a, b) => a.localeCompare(b, undefined, {
      numeric: true
    })).forEach(key => reportSeriesColor(key, chartPalette));
    chartSeries.forEach((s, index) => {
      const key = dateReport ? `measure:${s.metricId}` : seriesDims.length ?
        dimensionColorKey(seriesDims[0], s.seriesKey) :
        facetDims.length ? dimensionColorKey(facetDims[0], s.facet) :
        `measure:${s.metricId}`;
      s.color = reportSeriesColor(key, chartPalette);
      if (categoryColorDimension) s.pointColors = labels.map(value => reportSeriesColor(
        dimensionColorKey(categoryColorDimension, value), chartPalette));
      s.dash = dateReport ? '' : ['', '8 3', '2 3', '10 3 2 3'][index % 4];
    });
    const savedWidget = activeSheet()?.widgets.find(w => w.id === widget.dataset.widgetId);
    if (savedWidget) {
      savedWidget.lastSpreadsheetCsvRows = null;
    }
    const totalsByMetric = Object.fromEntries(metrics.map(m => [m, {
      current: reportMetricValue(m, totals.get(0)),
      compare: comparison ? reportMetricValue(m, totals.get(1)) : null
    }]));
    for (const id of metrics) {
      const selected = chartSeries.filter(s => s.metricId === id && s.periodKey === 0);
      const raw = totalsByMetric[id].current;
      const combined = {
        values: selected.flatMap(s => s.values),
        originalValues: selected.flatMap(s => s.originalValues || []),
        baselineValues: selected.flatMap(s => s.baselineValues || [])
      };
      if (config.tableCalculation === 'moving' && selected.length > 1) combined.values = Array
        .from({
          length: Math.max(...selected.map(s => s.values.length))
        }, (_, i) => {
          const values = selected.map(s => s.values[i]).filter(Number.isFinite);
          return values.length ? values.reduce((a, b) => a + b, 0) : null;
        });
      totalsByMetric[id].current = reportTransformTotal(combined, raw, config);
    }
    const chartType = config.chartType,
      separate = config.layout === 'separate',
      container = widget.querySelector('.widget-content');
    const kpis = metrics.flatMap(m => [{
      title: `${metricMeta(m).label} · Selected`,
      value: totalsByMetric[m].current,
      metric: m
    }, ...(comparison ? [{
      title: `${metricMeta(m).label} · Compare`,
      value: totalsByMetric[m].compare,
      metric: m
    }, {
      title: `${metricMeta(m).label} · Change`,
      value: (totalsByMetric[m].current || 0) - (totalsByMetric[m].compare || 0),
      metric: m
    }, {
      title: `${metricMeta(m).label} · Change %`,
      value: totalsByMetric[m].compare ? ((totalsByMetric[m].current - totalsByMetric[
        m].compare) / Math.abs(totalsByMetric[m].compare)) * 100 : null,
      metric: m,
      format: 'percent'
    }] : [])]);
    const hasDimensions = [...(config.xFields || []), ...(config.yFields || [])].some(field =>
      field.kind === 'dimension' && customAttributes.some(item => item.id === field.id));
    widget.querySelector('.widget-kpis').innerHTML = '';
    widget.querySelector('.widget-subtitle').textContent =
      `${current.label}${comparison?` · compared with ${comparison.label}`:''} · ${visibleCategoryDims.map(dimensionLabel).join(' → ')}${dateAxis?` (${grain})`:''}`;
    if (!chartSeries.length || !chartSeries.some(s => s.values.some(Number.isFinite))) {
      const emptyReason = formulaIssueText || (inspection.accepted > 0 ?
        `${inspection.accepted.toLocaleString()} records matched, but the selected measures returned no numeric results. Check measure formulas, NULL values, and zero denominators.` :
        'No records match this date range, filters, and selected metrics.');
      container.innerHTML = `<div class="widget-empty">${htmlEscape(emptyReason)}</div>`;
      statusNode.textContent = formulaIssueText || (inspection.accepted > 0 ?
        'Matched records; measures have no numeric results.' : 'No matching records.');
      return
    }
    container.innerHTML = '';
    const visual = chartType;
    container.classList.toggle('metric-card-content', visual === 'metric_card');
    const thresholdActive = config.thresholdEnabled && ['metric_card', 'spreadsheet', 'bullet']
      .includes(visual) && customMetrics.some(item => item.id === config.thresholdMetric),
      thresholdBandFor = value => {
        const number = Math.abs(Number(value)) * (metricMeta(config.thresholdMetric).format ===
          'percent' && metricMeta(config.thresholdMetric).percentScale === 'fraction' ? 100 :
          1);
        if (!thresholdActive || value == null || value === '' || !Number.isFinite(number))
          return null;
        for (const key of ['low', 'mid', 'high']) {
          const band = config.thresholdBands?.[key];
          if (!band) continue;
          const min = Number(band.min),
            max = band.max === '' || band.max == null ? Infinity : Number(band.max);
          if (Number.isFinite(min) && number >= min && number < max) return {
            key,
            background: band.background,
            text: band.text
          }
        }
        return null
      },
      thresholdClass = value => {
        const band = thresholdBandFor(value);
        return band ? `threshold-${band.key}` : ''
      },
      thresholdStyle = value => {
        const band = thresholdBandFor(value);
        return band ?
          ` style="--threshold-bg:${band.background};--threshold-text:${band.text}"` : ''
      },
      thresholdAttrs = value => {
        const band = thresholdBandFor(value);
        return band ?
          ` class="threshold-band threshold-${band.key}" style="--threshold-bg:${band.background};--threshold-text:${band.text}"` :
          ''
      },
      thresholdBucketsByX = new Map();
    if (thresholdActive)
      for (const bucket of buckets.values())
        if (bucket.period === 0) {
          const x = String(bucket.x),
            matching = thresholdBucketsByX.get(x) || [];
          matching.push(bucket);
          thresholdBucketsByX.set(x, matching)
        } const thresholdValueAtIndex = index => {
        const matching = thresholdBucketsByX.get(String(xKeys[index])) || [];
        return matching.length ? reportMetricValue(config.thresholdMetric,
          mergeReportAggregates(matching)) : null
      },
      thresholdTotal = thresholdActive ? reportMetricValue(config.thresholdMetric, totals.get(
        0)) : null;
    if (visual === 'metric_card') {
      container.innerHTML = `<div class="metric-card-grid" style="--metric-card-columns:${Math.ceil(Math.sqrt(metrics.length))};--metric-card-rows:${Math.ceil(metrics.length/Math.ceil(Math.sqrt(metrics.length)))}">${metrics.map(metricId => {
        const tone = thresholdClass(thresholdTotal), toneStyle = thresholdStyle(thresholdTotal);
        return `<div class="metric-card ${tone?'threshold-band '+tone:''}"${toneStyle}>${metrics.length>1?`<span>${htmlEscape(metricMeta(metricId).label)}</span>`:''}<strong>${htmlEscape(reportFormat(totalsByMetric[metricId].current,metricId))}</strong></div>`;
      }).join('')}</div>`;
      container.querySelectorAll('.metric-card').forEach(card => {
        fitMetricCardValue(card);
        metricCardFitObserver?.observe(card);
      });
      statusNode.textContent =
        `Metric Card · ${metrics.length} measure${metrics.length===1?'':'s'}`;
      return;
    }
    if (visual === 'spreadsheet') {
      const limit = Math.min(labels.length, 250),
        dimHeaders = visibleCategoryDims.some(id => id !== 'none') ? visibleCategoryDims.filter(
          id => id !== 'none').map(dimensionLabel) : [
          'Category'
        ];
      const measureAxis = plan.valueAxis === 'x' ? config.xFields : config.yFields;
      const columnFieldOrder = [];
      let metricLevel = false;
      for (const field of measureAxis) {
        if (field.kind === 'metric') {
          if (metricLevel) continue;
          metricLevel = true;
        }
        columnFieldOrder.push(field);
      }
      const seriesDimensionValue = (series, id) => {
        const ids = facetDims.includes(id) ? facetDims : seriesDims;
        return String(facetDims.includes(id) ? series.facet : series.seriesKey).split(' · ')[
          ids.indexOf(id)] || '';
      };
      chartSeries.sort((a, b) => {
        for (const field of columnFieldOrder) {
          const cmp = field.kind === 'metric' ? metrics.indexOf(a.metricId) - metrics
            .indexOf(b.metricId) : compareDimensionValue(seriesDimensionValue(a, field.id),
              seriesDimensionValue(b, field.id), field.id) * directionForDimension(field
              .id);
          if (cmp) return cmp;
        }
        return a.periodKey - b.periodKey;
      });
      const seriesPaths = chartSeries.map(series => {
        const axis = plan.valueAxis === 'x' ? config.xFields : config.yFields,
          parts = [];
        for (const field of columnFieldOrder) {
          if (field.kind === 'metric') {
            if (metrics.length > 1) parts.push(metricMeta(series.metricId).label);
          } else {
            const ids = facetDims.includes(field.id) ? facetDims : seriesDims;
            const source = facetDims.includes(field.id) ? series.facet : series.seriesKey;
            parts.push(String(source).split(' · ')[ids.indexOf(field.id)] || '');
          }
        }
        if (comparison) parts.push(periods.find(p => p.id === series.periodKey)?.label ||
          '');
        return parts.length ? parts : [''];
      });
      const depth = Math.max(1, ...seriesPaths.map(path => path.length)),
        matrix = [],
        rowKinds = [];
      for (let level = 0; level < depth; level++) {
        matrix.push([...dimHeaders.map(label => ({
          value: level === depth - 1 ? label : '',
          kind: 'corner'
        })), ...seriesPaths.map(path => ({
          value: path[level] || '',
          kind: 'column',
          prefix: path.slice(0, level + 1)
        }))]);
        rowKinds.push('header');
      }
      const matchingSeries = (series, keys) => [...buckets.values()].filter(b => b.period ===
        series.periodKey && b.facet === series.facet && b.series === series.seriesKey && (!
          keys || keys.has(String(b.x))));
      const seriesTotal = (series, keys = null) => {
        const item = customMetrics.find(m => m.id === series.metricId),
          matching = matchingSeries(series, keys);
        if (item?.tableMode === 'window') return reportWindowTotal(item, matching, buckets,
          xKeys.slice(0, 250));
        return matching.length ? reportTransformTotal(series, reportMetricValue(series
          .metricId, mergeReportAggregates(matching)), config) : null;
      };
      const appendTotal = (name, keys, kind) => {
        matrix.push([{
          value: name,
          kind: 'total-label'
        }, ...Array.from({
          length: dimHeaders.length - 1
        }, () => ({
          value: '',
          kind: 'total-label'
        })), ...chartSeries.map(series => ({
          value: reportFormat(seriesTotal(series, keys), series.metricId),
          kind: 'value'
        }))]);
        rowKinds.push(kind);
      };
      if (config.showGrandTotal !== false) appendTotal('Grand Total', null, 'grand-total');
      for (let i = 0; i < limit; i++) {
        const path = hierarchyPaths[i] || [labels[i] || ''];
        matrix.push([...dimHeaders.map((_, level) => ({
          value: path[level] ?? '',
          kind: 'row',
          prefix: path.slice(0, level + 1)
        })), ...chartSeries.map(series => ({
          value: reportFormat(series.values[i], series.metricId),
          kind: 'value'
        }))]);
        rowKinds.push('data');
        if (config.showSubtotals && visibleCategoryDims.length > 1) {
          for (let level = visibleCategoryDims.length - 2; level >= 0; level--) {
            const prefix = path.slice(0, level + 1);
            if (i + 1 < limit && prefix.every((v, j) => v === hierarchyPaths[i + 1]?.[j]))
              continue;
            let first = i;
            while (first > 0 && prefix.every((v, j) => v === hierarchyPaths[first - 1]?.[j]))
              first--;
            appendTotal(prefix.join(' · ') + ' Subtotal', new Set(xKeys.slice(first, i + 1).map(
              String)), 'subtotal');
          }
        }
      }
      const sheet = renderSpreadsheetCells(matrix, rowKinds, config.flipAxis, thresholdActive ?
      {
        rowValue: thresholdValueAtIndex,
        totalValue: thresholdTotal,
        attrs: thresholdAttrs
      } : null);
      if (savedWidget) savedWidget.lastSpreadsheetCsvRows = sheet.csv;
      container.innerHTML =
        '<p class="report-export-note" role="status">CSV matches displayed formatting, with merged header continuations left blank. Totals use unique source record IDs; table calculations respect their scope. Up to 250 categories are displayed.</p>' +
        sheet.html;
      let stickyTop = 0;
      container.querySelectorAll('[data-row-kind="header"]').forEach(row => {
        row.querySelectorAll('th').forEach(cell => cell.style.top = stickyTop + 'px');
        stickyTop += row.getBoundingClientRect().height;
      });
      statusNode.textContent =
        `Spreadsheet · ${metrics.length} measure${metrics.length===1?'':'s'} · ${labels.length} categories${labels.length>limit?' · showing first 250':''}`;
      return;
    }
    const groups = facetNames.flatMap(facet => {
      const facetSeries = chartSeries.filter(series => series.facet === facet);
      if (separate || ['pie', 'donut', 'funnel', 'waterfall', 'treemap', 'histogram',
          'calendar_heatmap'
        ].includes(visual)) return metrics.map(metricId => ({
        facet,
        metric: metricId,
        series: facetSeries.filter(series => series.metricId === metricId)
      })).filter(group => group.series.length);
      return facetSeries.length ? [{
        facet,
        metric: metrics[0] || metric,
        series: facetSeries
      }] : []
    });
    groups.forEach(({
      facet,
      metric: groupMetric,
      series: group
    }) => {
      const facetPanel = document.createElement('section');
      facetPanel.className = 'facet-panel';
      facetPanel.style.setProperty('--report-chart-text-color', '#302f2b');
      const panel = document.createElement('div');
      panel.className = 'chart-wrap';
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      const title = document.createElement('div');
      title.className = 'facet-title';
      title.textContent = metrics.length === 1 ? (facetDims.length ? facet : '') : [
        facetDims.length ? `${facet} · ` : '', separate || ['pie',
          'donut',
          'funnel', 'waterfall', 'treemap', 'histogram', 'calendar_heatmap'
        ].includes(visual) ? metricMeta(groupMetric).label : metrics.length > 1 ?
        'All measures' : metricMeta(groupMetric).label
      ].filter(Boolean).join('');
      title.hidden = !title.textContent;
      facetPanel.append(title);
      if (['pie', 'donut'].includes(visual)) {
        const entries = group.flatMap(series => series.values.map((value, index) => ({
          value,
          index,
          label: [visibleCategoryDims.some(id => id !== 'none') ? labels[index] :
            '', facetDims.length ? series.facet : '', seriesDims.length ? series
            .seriesKey : ''
          ].filter(Boolean).join(' · ') || (metrics.length > 1 ? metricMeta(
            groupMetric).label : ''),
          tooltip: series.tooltipPoints[index]
        })).filter(item => Number.isFinite(item.value)));
        panel.innerHTML = renderPieSvg(entries.map(item => item.label), {
            ...group[0],
            values: entries.map(item => item.value),
            tooltipPoints: entries.map(item => item.tooltip),
            reportIndices: entries.map(item => item.index)
          },
          groupMetric, entries.map(item => item.label), plottedDimensions.join('|') ||
          'none', chartPalette, visual === 'donut');
      } else if (config.flipAxis && visual === 'bar') panel.innerHTML =
        renderHorizontalBarSvg(displayLabels, group, groupMetric, labels, config
          .tickInterval, config);
      else panel.innerHTML = renderReportSvg(displayLabels, group, visual, groupMetric,
        config.overlays || [], labels, config.tickInterval, {
          ...config,
          connectDateValues: dateReport,
          palette: chartPalette,
          startDate: current.start,
          grain,
          calendarDates: xKeys.map(index => {
            return localDateKey(reportDateBucketAt(current.start, grain, index))
          }),
          calendarOrientation: (config.xFields || []).some(field => field.kind ===
            'dimension' && field.id === axis) ? 'horizontal' : 'vertical',
          bulletBandColors: {
            low: config.thresholdBands?.low?.background || '#eee8fa',
            mid: config.thresholdBands?.mid?.background || '#f7dce9',
            high: config.thresholdBands?.high?.background || '#df82b4'
          }
        });

      panel.querySelectorAll('title').forEach(titleNode => titleNode.remove());
      const legendDimension = !dateReport && plottedDimensions.length === 1 && !
        isReportDateField(plottedDimensions[0]) ? plottedDimensions[0] : null;
      const values = legendDimension ? categoryColorDimension ? labels : seriesDims
        .includes(legendDimension) ? group.map(s => s.seriesKey) : group.map(s => s.facet) :
        [];
      const legendValues = [...new Set(values)];
      legend.innerHTML = legendDimension ?
        `<b class="legend-title">${htmlEscape(dimensionLabel(legendDimension))}</b>` +
        legendValues.map(value =>
          `<span class="legend-item"><i class="legend-swatch" style="background:${reportSeriesColor(dimensionColorKey(legendDimension,value),chartPalette)}"></i>${htmlEscape(value)}</span>`
        ).join('') : '';
      const dimensionLegendAllowed = !!legendDimension && !['heatmap', 'calendar_heatmap',
        'histogram', 'box'
      ].includes(visual);
      const measureLegendAllowed = dateReport && metrics.length > 1 && !['heatmap',
        'calendar_heatmap', 'histogram', 'box'
      ].includes(visual);
      if (measureLegendAllowed) {
        const measureIds = [...new Set(group.map(s => s.metricId))];
        legend.innerHTML = measureIds.map(id =>
          `<span class="legend-item"><i class="legend-swatch" style="background:${group.find(s=>s.metricId===id).color}"></i>${htmlEscape(metricMeta(id).label)}</span>`
        ).join('');
      }
      legend.dataset.legendAllowed = String(dimensionLegendAllowed || measureLegendAllowed);
      legend.hidden = !(dimensionLegendAllowed || measureLegendAllowed) || config
        .showLegend === false;
      if (legendValues.length > 12) {
        const note = document.createElement('small');
        note.className = 'chart-encoding-note';
        note.textContent =
          'Many values: use the category labels, line patterns and hover details alongside colors.';
        facetPanel.append(note);
      }
      facetPanel.append(panel, legend);
      container.append(facetPanel)
    });
    const overlayList = config.overlays || [],
      overlays = overlayList.join(', ');
    let significance = '';
    if (overlayList.includes('significance')) {
      if (!comparison) significance = 'Significance requires a comparison period.';
      else {
        const left = chartSeries.filter(s => s.label.includes('Selected period')).flatMap(s => s
            .values),
          right = chartSeries.filter(s => s.label.includes('Comparison period')).flatMap(s => s
            .values),
          method = config.significanceMethod || 'welch',
          p = method === 'proportion' && metricMeta(metric).format !== 'percent' ? null :
          method === 'proportion' ? proportionPValue(left, right) : welchPValue(left, right);
        significance = method === 'proportion' && metricMeta(metric).format !== 'percent' ?
          'The proportion test requires a percentage metric.' : p == null ?
          'Significance needs at least two comparable buckets.' :
          `p=${p.toFixed(4)} · ${p<1-(config.confidence||95)/100?'significant':'not significant'} at ${config.confidence||95}% (${method==='proportion'?'two-proportion z-test':'Welch t-test'} across plotted buckets)`
      }
    }
    statusNode.textContent =
      `Ready · ${reportState.count.toLocaleString()} users analyzed.${chartWarning?` ${chartWarning}`:''}${overlays?` Overlays: ${overlays}.`:''}${significance?` ${significance}.`:''}${formulaIssueText?` ${formulaIssueText}`:''}`;
  }

  function reportTickValues(min, max, interval, count = 4) {
    const step = Number(interval);
    if (Number.isFinite(step) && step > 0) {
      const first = Math.ceil(min / step),
        last = Math.floor(max / step),
        ticks = [];
      for (let index = first; index <= last && ticks.length < 40; index++) ticks.push(index *
        step);
      if (ticks.length) return ticks
    }
    return Array.from({
      length: count + 1
    }, (_, index) => min + (max - min) * index / count)
  }

  function reportTooltipAttribute(value) {
    return htmlEscape(value || '').replace(/\n/g, '&#10;')
  }

  let reportAxisClipSequence = 0;
  const reportAxisClipPrefix =
    `value-axis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  function reportValueScale(values, options = {}) {
    const finite = values.filter(Number.isFinite),
      logarithmic = options.axisScale === 'log';
    if (!finite.length) return {
      error: 'No finite values to plot.'
    };
    if (logarithmic && finite.some(value => value <= 0)) return {
      error: 'Logarithmic scale requires positive values. This chart contains zero or negative values; choose Linear.'
    };
    const hasMinimum = options.valueAxisMinimum !== '' && options.valueAxisMinimum != null;
    const minimum = hasMinimum ? Number(options.valueAxisMinimum) : null;
    if (hasMinimum && (!Number.isFinite(minimum) || (logarithmic && minimum <= 0))) return {
      error: logarithmic ?
        'Value Axis Minimum must be greater than zero for a logarithmic axis.' :
        'Value Axis Minimum must be a finite number.'
    };
    if (hasMinimum && !options.allowEmptyBelowMinimum && finite.every(value => value < minimum))
      return {
        error: 'All plotted values are below Value Axis Minimum. Lower the minimum to display the chart.'
      };
    const includeZero = options.autoFitValueAxis == null ? options.includeZero : !options
      .autoFitValueAxis;
    const transform = logarithmic ? Math.log10 : value => value;
    const inverse = logarithmic ? value => 10 ** value : value => value;
    let low = Math.min(...finite),
      high = Math.max(...finite);
    if (includeZero && !logarithmic) {
      low = Math.min(0, low);
      high = Math.max(0, high);
    }
    if (Number.isFinite(Number(options.referenceValue)) && options.referenceValue !== '' &&
      options.referenceValue != null && (!logarithmic || Number(options.referenceValue) > 0)) {
      low = Math.min(low, Number(options.referenceValue));
      high = Math.max(high, Number(options.referenceValue));
    }
    let start = transform(low),
      end = transform(high);
    const pad = (end - start || (logarithmic ? .2 : Math.abs(end) * .1) || 1) * .08;
    start -= pad;
    end += pad;
    if (!logarithmic && includeZero) {
      if (low === 0) start = 0;
      if (high === 0) end = 0;
    }
    if (logarithmic && options.autoFitValueAxis === false) {
      start = Math.floor(start);
      end = Math.ceil(end);
    }
    if (hasMinimum) start = transform(minimum);
    if (!(end > start)) end = start + (logarithmic ? .1 : Math.max(Math.abs(start) * .08, 1));
    const min = inverse(start),
      max = inverse(end);
    const ticks = interval => {
      if (!logarithmic) {
        const values = reportTickValues(min, max, interval);
        return hasMinimum ? [...new Set([min, ...values])] : values;
      }
      const result = [min],
        first = Math.ceil(start),
        last = Math.floor(end),
        step = Math.max(1, Math.ceil((last - first + 1) / 6));
      for (let exponent = first; exponent <= last; exponent += step) result.push(10 **
        exponent);
      result.push(max);
      return [...new Set(result)];
    };
    return {
      min,
      max,
      ticks,
      ratio: value => (transform(hasMinimum ? value : Math.max(min, Math.min(max, value))) -
        start) / (end - start)
    };
  }

  function renderHorizontalBarSvg(labels, series, metric, interactionLabels = labels,
    tickInterval = '', options = {}) {
    const width = 920,
      rowH = 28,
      height = Math.max(180, 40 + labels.length * rowH),
      left = 180,
      right = 28,
      top = 12,
      bottom = 20,
      plotW = width - left - right,
      values = series.flatMap(s => s.values.filter(Number.isFinite));
    const scale = reportValueScale(values, {
      ...options,
      includeZero: options.includeZero !== false
    });
    if (scale.error) return `<div class="widget-empty">${htmlEscape(scale.error)}</div>`;
    const clipId = reportAxisClipPrefix + '-' + (++reportAxisClipSequence);
    const x = v => left + scale.ratio(v) * plotW,
      zero = x(options.axisScale === 'log' ? scale.min : Math.max(scale.min, Math.min(scale.max,
        0))),
      slot = rowH / Math.max(1, series.length),
      bw = Math.min(18, slot * .78),
      colors = ['#35144f', '#633087', '#9655b6', '#c28bd9', '#d9b2e8'];
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" data-value-min="${scale.min}" data-value-max="${scale.max}" aria-label="${htmlEscape(metricMeta(metric).label)} horizontal bar chart"><rect width="100%" height="100%" fill="#fbf8f0"/>`;
    for (const v of scale.ticks(tickInterval)) {
      const xx = x(v);
      svg +=
        `<line x1="${xx}" y1="${top}" x2="${xx}" y2="${height-bottom}" stroke="#ded8cc"/><text x="${xx}" y="${height-5}" text-anchor="middle" fill="#6b675f" font-size="10">${htmlEscape(analysisFormat(v,metric,options))}</text>`
    }
    svg += `<line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" stroke="#b9b1a3"/>`;
    svg +=
      `<defs><clipPath id="${clipId}"><rect x="${left}" y="${top}" width="${plotW}" height="${height-top-bottom}"/></clipPath></defs>`;
    labels.forEach((label, i) => {
      svg +=
        `<text x="${left-8}" y="${top+i*rowH+rowH/2+4}" text-anchor="end" fill="#6b675f" font-size="10">${htmlEscape(label.slice(0,28))}</text>`;
      svg += `<g data-value-plot="" clip-path="url(#${clipId})">`;
      series.forEach((s, si) => {
        const v = Number(s.values[i] || 0),
          yy = top + i * rowH + rowH / 2 + (si - (series.length - 1) / 2) * bw,
          xx = x(v);
        svg +=
          `<rect x="${Math.min(zero,xx)}" y="${yy-bw/2}" width="${Math.max(.5,Math.abs(xx-zero))}" height="${bw}" rx="2" fill="${s.pointColors?.[i]||s.color||colors[si%colors.length]}" data-chart-tooltip="${reportTooltipAttribute(s.tooltipPoints?.[i]||`${interactionLabels[i]||label}\n${s.label}: ${reportFormat(v,s.metricId||metric)}`)}" data-report-index="${i}" data-report-value="${htmlEscape(interactionLabels[i]||label)}"></rect>`
      });
      svg += '</g>';
    });
    return svg + '</svg>'
  }

  function reportLinePath(points, shape = 'straight', connectGaps = false, horizontal = false) {
    const segments = [
      []
    ];
    for (const point of points) {
      if (!point) {
        if (!connectGaps && segments[segments.length - 1].length) segments.push([]);
        continue;
      }
      segments[segments.length - 1].push(point);
    }
    const clamp = (value, a, b) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), value));
    return segments.filter(part => part.length).map(part => {
      let path = `M${part[0].x},${part[0].y} `;
      for (let i = 1; i < part.length; i++) {
        const p = part[i - 1],
          q = part[i];
        if (shape === 'step') path += horizontal ? `V${q.y} H${q.x} ` : `H${q.x} V${q.y} `;
        else if (shape === 'smooth') {
          const before = part[Math.max(0, i - 2)],
            after = part[Math.min(part.length - 1, i + 1)];
          const c1x = clamp(p.x + (q.x - before.x) / 6, p.x, q.x),
            c1y = clamp(p.y + (q.y - before.y) / 6, p.y, q.y);
          const c2x = clamp(q.x - (after.x - p.x) / 6, p.x, q.x),
            c2y = clamp(q.y - (after.y - p.y) / 6, p.y, q.y);
          path += `C${c1x},${c1y} ${c2x},${c2y} ${q.x},${q.y} `;
        } else path += `L${q.x},${q.y} `;
      }
      return path;
    }).join('');
  }

  function reportLinePoint(x, y, color, marker, attributes) {
    const common = `data-line-marker="${marker}" data-point-color="${color}" ${attributes}`;
    if (marker === 'square')
      return `<rect x="${x-4}" y="${y-4}" width="8" height="8" fill="${color}" ${common}/>`;
    if (marker === 'donut')
      return `<circle cx="${x}" cy="${y}" r="5" fill="#fbf8f0" stroke="${color}" stroke-width="2.5" ${common}/>`;
    if (marker === 'circle')
      return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" ${common}/>`;
    if (marker === 'dot')
      return `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}" ${common}/>`;
    return `<circle cx="${x}" cy="${y}" r="8" fill="transparent" pointer-events="all" ${common}/>`;
  }

  function renderReportLineSeries(item, labels, interactionLabels, metric, x, y, options,
    horizontal = false) {
    const marker = ['dot', 'circle', 'donut', 'square'].includes(options.lineMarker) ? options
      .lineMarker : 'none';
    const shape = ['step', 'smooth'].includes(options.lineShape) ? options.lineShape : 'straight';
    const points = item.values.map((value, index) => Number.isFinite(value) ? {
      x: x(index, value),
      y: y(index, value)
    } : null);
    let svg =
      `<path data-line-shape="${shape}" d="${reportLinePath(points,shape,options.connectDateValues,horizontal)}" fill="none" stroke="${item.color}" stroke-width="2.5" stroke-dasharray="${item.dash||''}" stroke-linejoin="round" stroke-linecap="round"/>`;
    item.values.forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      const tooltip = item.tooltipPoints?.[index] ||
        `${labels[index]||''}\n${item.label}: ${reportFormat(value,item.metricId||metric)}`;
      svg += reportLinePoint(points[index].x, points[index].y, item.pointColors?.[index] ||
        item.color, marker,
        `data-chart-tooltip="${reportTooltipAttribute(tooltip)}" data-report-index="${index}" data-report-value="${htmlEscape(interactionLabels[index]||labels[index]||'')}"`
      );
    });
    return svg;
  }

  function renderHorizontalLineSvg(labels, series, metric, overlays, interactionLabels,
    tickInterval, options) {
    const width = 920,
      height = 330,
      left = 180,
      right = 28,
      top = 18,
      bottom = 45,
      plotW = width - left - right,
      plotH = height - top - bottom;
    const values = series.flatMap(item => item.values.filter(Number.isFinite));
    const scale = reportValueScale(values, {
      ...options,
      includeZero: false
    });
    if (scale.error) return `<div class="widget-empty">${htmlEscape(scale.error)}</div>`;
    const x = value => left + scale.ratio(value) * plotW,
      y = index => top + (labels.length < 2 ? plotH / 2 : index / (labels.length - 1) * plotH);
    const clipId = reportAxisClipPrefix + '-' + (++reportAxisClipSequence);
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" data-date-axis="y" data-value-min="${scale.min}" data-value-max="${scale.max}" data-value-scale="${options.axisScale==='log'?'log':'linear'}" aria-label="${htmlEscape(metricMeta(metric).label)} horizontal line chart"><rect width="100%" height="100%" fill="#fbf8f0"/>`;
    for (const value of scale.ticks(tickInterval)) svg +=
      `<line x1="${x(value)}" x2="${x(value)}" y1="${top}" y2="${height-bottom}" stroke="#ded8cc"/><text x="${x(value)}" y="${height-12}" text-anchor="middle" fill="#6b675f" font-size="10">${htmlEscape(analysisFormat(value,metric,options))}</text>`;
    for (let i = 0; i < Math.min(8, labels.length); i++) {
      const index = Math.round(i * (labels.length - 1) / Math.max(1, Math.min(8, labels.length) -
        1));
      svg +=
        `<text data-axis-label="category" x="${left-8}" y="${y(index)+4}" text-anchor="end" fill="#6b675f" font-size="10">${htmlEscape(labels[index])}</text>`;
    }
    svg +=
      `<line x1="${left}" x2="${left}" y1="${top}" y2="${height-bottom}" stroke="#777066"/><defs><clipPath id="${clipId}"><rect x="${left}" y="${top}" width="${plotW}" height="${plotH}"/></clipPath></defs><g data-value-plot="" clip-path="url(#${clipId})">`;
    for (const item of series) svg += renderReportLineSeries(item, labels, interactionLabels,
      metric, (_, value) => x(value), index => y(index), options, true);
    const sorted = values.slice().sort((a, b) => a - b),
      mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    const references = [];
    if (overlays.includes('mean')) references.push(['Mean', mean]);
    if (overlays.includes('median')) references.push(['Median', sorted[Math.floor((sorted.length -
      1) / 2)]]);
    if (overlays.includes('mode')) references.push(['Mode', ReportingTools.statistic(values,
      'table_mode')]);
    if (options.referenceValue !== '' && options.referenceValue != null) references.push([options
      .referenceLabel || 'Target', Number(options.referenceValue)
    ]);
    for (const [label, value] of references)
      if (Number.isFinite(value)) svg +=
        `<line x1="${x(value)}" x2="${x(value)}" y1="${top}" y2="${height-bottom}" stroke="#665f54" stroke-dasharray="6 4"><title>${htmlEscape(label)}: ${htmlEscape(analysisFormat(value,metric,options))}</title></line>`;
    return svg + '</g></svg>';
  }

  function renderReportSvg(labels, series, type, metric, overlays = [], interactionLabels =
    labels, tickInterval = '', options = {}) {
    if (['bar', 'line', 'area', 'stacked_area', 'scatter', 'box', 'combo', 'waterfall'].includes(
        type))({
      labels,
      series,
      interactionLabels
    } = trimReportPlot(labels, series, interactionLabels, options));
    if (!labels.length) return '<div class="widget-empty">No plotted values in this range.</div>';
    if (type === 'line' && options.flipAxis) return renderHorizontalLineSvg(labels, series,
      metric, overlays, interactionLabels, tickInterval, options);
    if (type === 'waterfall') return renderWaterfallSvg(labels, series[0], metric,
      interactionLabels, options.palette || REPORT_CHART_PALETTE);
    if (type === 'funnel') return renderFunnelSvg(labels, series[0], metric, interactionLabels,
      options.palette || REPORT_CHART_PALETTE);
    if (type === 'heatmap') return renderHeatmapSvg(labels, series, metric, interactionLabels,
      type);
    if (type === 'histogram') return renderHistogramSvg(series, metric, options.palette ||
      REPORT_CHART_PALETTE);
    if (type === 'treemap') return renderTreemapSvg(labels, series[0], metric, interactionLabels,
      options.palette || REPORT_CHART_PALETTE);
    if (type === 'bullet') return renderBulletSvg(labels, series, metric, interactionLabels,
      options.palette || REPORT_CHART_PALETTE, options);
    if (type === 'calendar_heatmap') return renderCalendarHeatmapSvg(series[0], metric, options);
    const priorValues = series.filter(s => s.periodKey === 1).flatMap(s => s.values.filter(Number
      .isFinite));
    if (options.referenceSource === 'prior_average') options = {
      ...options,
      referenceValue: priorValues.length ? priorValues.reduce((a, b) => a + b, 0) / priorValues
        .length : null,
      referenceLabel: 'Previous-period average'
    };
    const width = 920,
      height = 330,
      left = 62,
      right = 20,
      top = 18,
      bottom = 52,
      plotW = width - left - right,
      plotH = height - top - bottom,
      n = Math.max(1, labels.length),
      rawValues = series.flatMap(s => s.values.filter(Number.isFinite)),
      lineValues = type === 'combo' ? series.filter((item, index) => series[0]?.metricId ? item
        .metricId !== series[0].metricId : index > 0).flatMap(s => s.values.filter(Number
        .isFinite)) : [],
      stackedAreaTotals = type === 'stacked_area' ? labels.map((_, index) => series.reduce((sum,
        item) => sum + (Number(item.values[index]) || 0), 0)) : [],
      values = type === 'combo' ? series.filter((item, index) => series[0]?.metricId ? item
        .metricId === series[0].metricId : index === 0).flatMap(item => item.values.filter(Number
        .isFinite)) : [...rawValues, ...stackedAreaTotals];
    const logarithmic = ['bar', 'line', 'scatter', 'combo'].includes(type) && options
      .axisScale === 'log';
    if (logarithmic && rawValues.some(value => value <= 0))
      return '<div class="widget-empty">Logarithmic scale requires positive values. This chart contains zero or negative values; choose Linear.</div>';
    const stackedTotals = type === 'bar' ? labels.flatMap((_, i) => [series.reduce((sum, item) =>
      sum + Math.max(0, item.values[i] || 0), 0), series.reduce((sum, item) => sum + Math
      .min(0, item.values[i] || 0), 0)]).filter(value => value !== 0 && (!logarithmic || value >
      0)) : [];
    const includeZero = ['bar', 'area', 'stacked_area', 'combo'].includes(type);
    const scale = reportValueScale([...values, ...stackedTotals], {
      ...options,
      allowEmptyBelowMinimum: type === 'combo' && lineValues.some(value => value >= Number(
        options.valueAxisMinimum)),
      axisScale: logarithmic ? 'log' : 'linear',
      includeZero
    });
    if (scale.error) return `<div class="widget-empty">${htmlEscape(scale.error)}</div>`;
    const min = scale.min,
      max = scale.max,
      y = v => top + (1 - scale.ratio(v)) * plotH,
      lineScale = reportValueScale(lineValues.length ? lineValues : [1], {
        autoFitValueAxis: options.autoFitValueAxis,
        valueAxisMinimum: type === 'combo' ? options.valueAxisMinimum : undefined,
        allowEmptyBelowMinimum: true,
        axisScale: logarithmic ? 'log' : 'linear',
        includeZero: false
      }),
      yLine = v => top + (1 - lineScale.ratio(v)) * plotH,
      x = i => left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW),
      zero = y(logarithmic ? min : Math.max(min, Math.min(max, 0))),
      fmt = v => analysisFormat(v, metric, options);
    if (type === 'combo' && lineValues.length && lineScale.error)
      return `<div class="widget-empty">${htmlEscape(lineScale.error)}</div>`;
    const clipId = reportAxisClipPrefix + '-' + (++reportAxisClipSequence);
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" data-value-min="${min}" data-value-max="${max}" data-value-scale="${logarithmic?'log':'linear'}" aria-label="${htmlEscape(metricMeta(metric).label)} chart"><rect width="100%" height="100%" fill="#fbf8f0"/>`;
    for (const value of scale.ticks(tickInterval)) {
      const yy = y(value);
      svg +=
        `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="#ded8cc"/><text x="${left-8}" y="${yy+4}" text-anchor="end" fill="#6b675f" font-size="10">${htmlEscape(fmt(value))}</text>`
    }
    svg += `<line x1="${left}" y1="${zero}" x2="${width-right}" y2="${zero}" stroke="#b9b1a3"/>`;
    svg +=
      `<defs><clipPath id="${clipId}"><rect x="${left}" y="${top}" width="${plotW}" height="${plotH}"/></clipPath></defs><g data-value-plot="" clip-path="url(#${clipId})">`;
    if (overlays.includes('significance')) svg +=
      `<line x1="${left+8}" y1="${top+5}" x2="${width-right-8}" y2="${top+5}" stroke="#b16889" stroke-width=1.5/><text x="${width-right-8}" y="${top+16}" text-anchor="end" font-size="9" fill="#965473">period comparison</text>`;
    if (type === 'area' || type === 'stacked_area') {
      const baseline = Array(labels.length).fill(0);
      for (const s of series) {
        const upper = s.values.map((value, index) => {
            const amount = Number.isFinite(value) ? value : 0;
            return type === 'stacked_area' ? baseline[index] + amount : amount
          }),
          lower = type === 'stacked_area' ? [...baseline] : Array(labels.length).fill(0),
          points = [...upper.map((value, index) => `${x(index)},${y(value)}`), ...lower.map((
            value, index) => `${x(labels.length-1-index)},${y(value)}`)],
          tooltip = s.tooltipPoints || [];
        if (type === 'stacked_area') upper.forEach((value, index) => baseline[index] = value);
        svg +=
          `<polygon points="${points.join(' ')}" fill="${s.color}" fill-opacity=".75" stroke="${s.color}" stroke-width="1.5"/>`;
        s.values.forEach((value, index) => {
          if (Number.isFinite(value)) svg +=
            `<circle cx="${x(index)}" cy="${y(upper[index])}" r="3" fill="${s.pointColors?.[index]||s.color}" data-chart-tooltip="${reportTooltipAttribute(tooltip[index]||`${labels[index]}\n${s.label}: ${reportFormat(value,s.metricId||metric)}`)}" data-report-index="${index}" data-report-value="${htmlEscape(interactionLabels[index]||labels[index]||'')}"></circle>`
        })
      }
    } else if (type === 'combo') {
      const barMetric = series[0]?.metricId,
        barSeries = series.filter(item => item.metricId === barMetric),
        slot = plotW / n,
        bw = Math.max(2, Math.min(24, slot * .48 / Math.max(1, barSeries.length)));
      series.forEach(item => {
        if (item.metricId === barMetric) {
          const seriesIndex = barSeries.indexOf(item);
          item.values.forEach((value, index) => {
            if (!Number.isFinite(value)) return;
            const yy = y(value),
              cx = x(index) + (seriesIndex - (barSeries.length - 1) / 2) * bw;
            svg +=
              `<rect x="${cx-bw/2}" y="${Math.min(yy,zero)}" width="${bw}" height="${Math.max(.5,Math.abs(zero-yy))}" fill="${item.pointColors?.[index]||item.color}" data-chart-tooltip="${reportTooltipAttribute(item.tooltipPoints?.[index]||`${labels[index]}\n${item.label}: ${reportFormat(value,item.metricId||metric)}`)}" data-report-index="${index}" data-report-value="${htmlEscape(interactionLabels[index]||labels[index]||'')}"></rect>`
          })
        } else {
          svg += renderReportLineSeries(item, labels, interactionLabels, metric, index => x(
            index), (_, value) => yLine(value), options);
        }
      })
    } else if (type === 'scatter') {
      series.forEach((s, si) => s.values.forEach((v, i) => {
        if (Number.isFinite(v)) svg +=
          `<circle cx="${x(i)+(si-(series.length-1)/2)*6}" cy="${y(v)}" r="4" fill="${s.pointColors?.[i]||s.color}" opacity=".75" data-chart-tooltip="${reportTooltipAttribute(s.tooltipPoints?.[i]||`${labels[i]||''}\n${s.label}: ${reportFormat(v,s.metricId||metric)}`)}" data-report-index="${i}" data-report-value="${htmlEscape(interactionLabels[i]||labels[i]||'')}"></circle>`
      }))
    } else if (type === 'box') {
      series.forEach((s, si) => {
        const a = s.values.filter(Number.isFinite).slice().sort((p, q) => p - q);
        if (!a.length) return;
        const q = v => a[Math.floor((a.length - 1) * v)],
          q1 = q(.25),
          med = q(.5),
          q3 = q(.75),
          lo = a.find(v => v >= q1 - 1.5 * (q3 - q1)) ?? a[0],
          hi = [...a].reverse().find(v => v <= q3 + 1.5 * (q3 - q1)) ?? a.at(-1),
          cx = left + (si + 1) * plotW / (series.length + 1),
          bw = Math.min(44, plotW / (series.length + 1) * .5);
        svg +=
          `<line x1="${cx}" y1="${y(lo)}" x2="${cx}" y2="${y(hi)}" stroke="${s.color}"/><line x1="${cx-bw/3}" y1="${y(lo)}" x2="${cx+bw/3}" y2="${y(lo)}" stroke="${s.color}"/><line x1="${cx-bw/3}" y1="${y(hi)}" x2="${cx+bw/3}" y2="${y(hi)}" stroke="${s.color}"/><rect x="${cx-bw/2}" y="${y(q3)}" width="${bw}" height="${Math.max(1,y(q1)-y(q3))}" fill="${s.color}" fill-opacity=".3" stroke="${s.color}" data-chart-tooltip="${reportTooltipAttribute([...(s.tooltipContext||[]),`${metricMeta(s.metricId||metric).label} distribution`, `Q1: ${reportFormat(q1,s.metricId||metric)}`, `Median: ${reportFormat(med,s.metricId||metric)}`, `Q3: ${reportFormat(q3,s.metricId||metric)}`].join('\n'))}"></rect><line x1="${cx-bw/2}" y1="${y(med)}" x2="${cx+bw/2}" y2="${y(med)}" stroke="${s.color}" stroke-width="3"/><text x="${cx}" y="${height-20}" text-anchor="middle" font-size="10" fill="#6b675f">${htmlEscape(s.label)}</text>`;
        if (overlays.includes('outliers')) a.filter(v => v < lo || v > hi).forEach(v => svg +=
          `<circle cx="${cx}" cy="${y(v)}" r="3.5" fill="#d35d76" data-chart-tooltip="${reportTooltipAttribute([...(s.tooltipContext||[]),`${metricMeta(s.metricId||metric).label}: ${reportFormat(v,s.metricId||metric)}`, 'Outlier'].join('\n'))}"/>`
        )
      })
    } else if (type === 'bar') {
      const slot = plotW / n,
        bw = Math.max(2, Math.min(28, slot * .72));
      for (let i = 0; i < n; i++) {
        let pos = 0,
          neg = 0;
        series.forEach(s => {
          const v = Number(s.values[i] || 0);
          if (v >= 0) {
            const yy = y(pos + v);
            svg +=
              `<rect x="${x(i)-bw/2}" y="${yy}" width="${bw}" height="${Math.max(.5,y(pos)-yy)}" rx="2" fill="${s.pointColors?.[i]||s.color}" data-chart-tooltip="${reportTooltipAttribute(s.tooltipPoints?.[i]||`${labels[i]||''}\n${s.label}: ${reportFormat(v,s.metricId||metric)}`)}" data-report-index="${i}" data-report-value="${htmlEscape(interactionLabels[i]||labels[i]||'')}"></rect>`;
            pos += v
          } else {
            const yy = y(neg + v);
            svg +=
              `<rect x="${x(i)-bw/2}" y="${y(neg)}" width="${bw}" height="${Math.max(.5,yy-y(neg))}" rx="2" fill="${s.pointColors?.[i]||s.color}" data-chart-tooltip="${reportTooltipAttribute(s.tooltipPoints?.[i]||`${labels[i]||''}\n${s.label}: ${reportFormat(v,s.metricId||metric)}`)}" data-report-index="${i}" data-report-value="${htmlEscape(interactionLabels[i]||labels[i]||'')}"></rect>`;
            neg += v
          }
        })
      }
    } else series.forEach(item => {
      svg += renderReportLineSeries(item, labels, interactionLabels, metric, index => x(
        index), (_, value) => y(value), options);
    });
    const nums = values.slice().sort((a, b) => a - b),
      mean = nums.reduce((a, b) => a + b, 0) / (nums.length || 1),
      median = nums[Math.floor((nums.length - 1) / 2)] || 0,
      mode = nums.length ? nums.reduce((best, v) => nums.filter(x => x === v).length > nums
        .filter(x => x === best).length ? v : best, nums[0]) : 0;
    const lines = [];
    if (overlays.includes('mean')) lines.push(['Mean', mean, '#9769b9']);
    if (overlays.includes('median')) lines.push(['Median', median, '#533078']);
    if (overlays.includes('mode')) lines.push(['Mode', mode, '#ad83ca']);
    if (overlays.includes('trend') && values.length > 1) {
      const pts = series.flatMap(s => s.values.map((v, i) => Number.isFinite(v) ? [i, v] : null)
          .filter(Boolean)),
        mx = pts.reduce((a, p) => a + p[0], 0) / pts.length,
        my = pts.reduce((a, p) => a + p[1], 0) / pts.length,
        slope = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / (pts.reduce((a, p) => a +
          (p[0] - mx) ** 2, 0) || 1);
      svg +=
        `<line x1="${x(0)}" y1="${y(my+slope*(0-mx))}" x2="${x(n-1)}" y2="${y(my+slope*(n-1-mx))}" stroke="#cc6873" stroke-width="2" stroke-dasharray="5 4"/>`
    };
    for (const [label, v, color] of lines) svg +=
      `<line x1="${left}" y1="${y(v)}" x2="${width-right}" y2="${y(v)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 4"><title>${label}: ${fmt(v)}</title></line>`;
    if (overlays.includes('outliers') && nums.length > 3) {
      const q1 = nums[Math.floor((nums.length - 1) * .25)],
        q3 = nums[Math.floor((nums.length - 1) * .75)],
        lo = q1 - 1.5 * (q3 - q1),
        hi = q3 + 1.5 * (q3 - q1);
      series.forEach(s => s.values.forEach((v, i) => {
        if (Number.isFinite(v) && (v < lo || v > hi)) svg +=
          `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="#d35d76"><title>Outlier: ${fmt(v)}</title></circle>`
      }))
    }
    svg += '</g>';
    const tickCount = Math.min(8, n);
    for (let t = 0; t < tickCount; t++) {
      const i = Math.round(t * (n - 1) / Math.max(1, tickCount - 1));
      svg +=
        `<text x="${x(i)}" y="${height-20}" text-anchor="middle" fill="#6b675f" font-size="10">${htmlEscape(labels[i]||'')}</text>`
    }
    if (options.referenceValue !== '' && options.referenceValue != null && Number.isFinite(Number(
        options.referenceValue))) {
      const yy = y(Number(options.referenceValue));
      if (yy >= top && yy <= height - bottom) svg +=
        `<line x1="${left}" x2="${width-right}" y1="${yy}" y2="${yy}" stroke="#665f54" stroke-dasharray="6 4"/><text x="${left+5}" y="${yy-5}" font-size="10">${htmlEscape(options.referenceLabel||'Target')} ${htmlEscape(fmt(Number(options.referenceValue)))}</text>`;
    }
    svg += `<line x1="${left}" x2="${left}" y1="${top}" y2="${height-bottom}" stroke="#777066"/>`;
    return svg + '</svg>';
  }

  function renderWaterfallSvg(labels, series, metric, interactionLabels, palette) {
    if (!series)
      return '<div class="widget-empty">Add one measure to create a waterfall chart.</div>';
    const values = series.values.map(value => Number(value) || 0),
      running = [];
    let total = 0;
    for (const value of values) {
      running.push({
        start: total,
        end: total + value,
        value
      });
      total += value
    }
    const min = Math.min(0, ...running.map(item => Math.min(item.start, item.end))),
      max = Math.max(0, ...running.map(item => Math.max(item.start, item.end))),
      width = 920,
      height = 350,
      left = 55,
      right = 20,
      top = 18,
      bottom = 70,
      plotW = width - left - right,
      plotH = height - top - bottom,
      span = max - min || 1,
      y = value => top + (max - value) / span * plotH,
      slot = plotW / Math.max(1, values.length),
      barW = Math.min(42, slot * .62);
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${htmlEscape(metricMeta(metric).label)} waterfall chart"><rect width="100%" height="100%" fill="#fbf8f0"/><line x1="${left}" y1="${y(0)}" x2="${width-right}" y2="${y(0)}" stroke="#aaa4b1"/>`;
    running.forEach((item, index) => {
      const color = series.pointColors?.[index] || (item.value < 0 ? palette[4] : palette[0]),
        x = left + index * slot + (slot - barW) / 2,
        topY = y(Math.max(item.start, item.end)),
        bottomY = y(Math.min(item.start, item.end));
      svg +=
        `<rect x="${x}" y="${topY}" width="${barW}" height="${Math.max(1,bottomY-topY)}" fill="${color}" data-chart-tooltip="${reportTooltipAttribute(series.tooltipPoints?.[index]||`${labels[index]}\n${metricMeta(series.metricId||metric).label}: ${reportFormat(item.value,series.metricId||metric)}\nRunning total: ${reportFormat(item.end,series.metricId||metric)}`)}" data-report-index="${index}" data-report-value="${htmlEscape(interactionLabels[index]||labels[index]||'')}"></rect><text x="${x+barW/2}" y="${height-35}" text-anchor="middle" font-size="9">${htmlEscape(String(labels[index]||'').slice(0,18))}</text>`;
      if (index < running.length - 1) svg +=
        `<line x1="${x+barW}" y1="${y(item.end)}" x2="${x+slot}" y2="${y(item.end)}" stroke="#aaa4b1" stroke-dasharray="3 3"/>`
    });
    return svg + '</svg>'
  }

  function renderFunnelSvg(labels, series, metric, interactionLabels, palette) {
    if (!series) return '<div class="widget-empty">Add a measure to create a funnel chart.</div>';
    const items = series.values.map((value, index) => ({
        value: Math.max(0, Number(value) || 0),
        index
      })),
      max = Math.max(1, ...items.map(item => item.value)),
      width = 760,
      height = Math.max(260, items.length * 58 + 20),
      center = width / 2,
      top = 12,
      rowH = (height - 24) / Math.max(1, items.length),
      maxW = width * .76;
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${htmlEscape(metricMeta(metric).label)} funnel chart">`;
    items.forEach((item, stage) => {
      const next = items[stage + 1]?.value ?? 0,
        w = maxW * item.value / max,
        h1 = rowH * .84,
        w2 = maxW * next / max,
        y = top + stage * rowH,
        x1 = center - w / 2,
        x2 = center - w2 / 2,
        color = palette[stage % palette.length];
      svg +=
        `<path d="M${x1} ${y} L${x1+w} ${y} L${center+w2/2} ${y+h1} L${center-w2/2} ${y+h1} Z" fill="${color}" opacity=".88" data-chart-tooltip="${reportTooltipAttribute(series.tooltipPoints?.[item.index]||`${labels[item.index]}\n${metricMeta(series.metricId||metric).label}: ${reportFormat(item.value,series.metricId||metric)}`)}" data-report-index="${item.index}" data-report-value="${htmlEscape(interactionLabels[item.index]||labels[item.index]||'')}"/><text x="${center}" y="${y+h1/2+4}" text-anchor="middle" font-size="11" fill="${colorHexToHsl(series.pointColors?.[item.index]||palette[index%palette.length])[2]>.55?'#302f2b':'#fffdf8'}">${htmlEscape(String(labels[item.index]||'').slice(0,40))} · ${htmlEscape(reportFormat(item.value,series.metricId||metric))}</text>`
    });
    return svg + '</svg>'
  }

  function renderHeatmapSvg(labels, series, metric, interactionLabels, type) {
    const width = 920,
      left = 150,
      top = 38,
      cellW = Math.max(18, Math.min(72, (width - left - 20) / Math.max(1, labels.length))),
      rowH = 34,
      height = top + series.length * rowH + 15,
      max = Math.max(1, ...series.flatMap(item => item.values.map(value => Math.abs(Number(
        value) || 0))));
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${type==='cohort_heatmap'?'Cohort heatmap':'Heatmap'}"><rect width="100%" height="100%" fill="#fbf8f0"/>`;
    series.forEach((item, row) => {
      const y = top + row * rowH;
      svg +=
        `<text x="${left-8}" y="${y+21}" text-anchor="end" font-size="10">${htmlEscape(String(item.label).slice(0,24))}</text>`;
      item.values.forEach((value, column) => {
        if (!Number.isFinite(value)) return;
        const strength = Math.min(.88, .12 + .76 * Math.abs(value) / max),
          x = left + column * cellW;
        svg +=
          `<rect x="${x+1}" y="${y+1}" width="${Math.max(1,cellW-2)}" height="${rowH-2}" rx="2" fill="${item.color}" fill-opacity="${strength}" data-chart-tooltip="${reportTooltipAttribute(item.tooltipPoints?.[column]||`${labels[column]}\n${item.label}: ${reportFormat(value,item.metricId||metric)}`)}" data-report-index="${column}" data-report-value="${htmlEscape(interactionLabels[column]||labels[column]||'')}"/>`
      });
    });
    const step = Math.max(1, Math.ceil(labels.length / 14));
    labels.forEach((label, index) => {
      if (index % step === 0) svg +=
        `<text x="${left+index*cellW+cellW/2}" y="24" text-anchor="middle" font-size="9">${htmlEscape(String(label).slice(0,14))}</text>`
    });
    return svg + '</svg>'
  }

  function renderHistogramSvg(series, metric, palette) {
    const values = series.flatMap(item => item.values.filter(Number.isFinite));
    if (!values.length)
      return '<div class="widget-empty">No numeric values for a histogram.</div>';
    let min = Math.min(...values),
      max = Math.max(...values);
    if (min === max) {
      min -= .5;
      max += .5
    }
    const count = Math.max(5, Math.min(20, Math.round(Math.sqrt(values.length)))),
      width = 920,
      height = 350,
      left = 62,
      right = 20,
      top = 18,
      bottom = 55,
      plotW = width - left - right,
      plotH = height - top - bottom,
      step = (max - min) / count,
      countsBySeries = series.map(item => {
        const counts = Array(count).fill(0);
        item.values.forEach(value => {
          if (Number.isFinite(value)) counts[Math.min(count - 1, Math.max(0, Math.floor((
            value - min) / step)))]++
        });
        return counts
      }),
      maxCount = Math.max(1, ...countsBySeries.flat()),
      slot = plotW / count,
      barW = Math.max(1, (slot - 2) / Math.max(1, series.length));
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${htmlEscape(metricMeta(metric).label)} histogram · X: measure value · Y: count"><rect width="100%" height="100%" fill="#fbf8f0"/>`;
    for (let tick = 0; tick <= 4; tick++) {
      const value = Math.round(maxCount * tick / 4),
        y = top + plotH - value / maxCount * plotH;
      svg +=
        `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#ded8cc"/><text x="${left-8}" y="${y+4}" text-anchor="end" font-size="9">${value}</text>`
    }
    countsBySeries.forEach((counts, seriesIndex) => counts.forEach((amount, index) => {
      if (!amount) return;
      const x = left + index * slot + 1 + seriesIndex * barW,
        h = amount / maxCount * plotH,
        y = top + plotH - h,
        low = min + step * index,
        high = low + step,
        item = series[seriesIndex],
        context = (item.tooltipContext || []).join(' · '),
        tooltip = [context,
          `${metricMeta(item.metricId||metric).label}: ${reportFormat(low,item.metricId||metric)} to ${reportFormat(high,item.metricId||metric)}`,
          `Count: ${amount}`
        ].filter(Boolean).join('\n');
      svg +=
        `<rect x="${x}" y="${y}" width="${Math.max(1,barW-1)}" height="${h}" fill="${item.color||palette[seriesIndex%palette.length]}" data-chart-tooltip="${reportTooltipAttribute(tooltip)}"/><text x="${left+index*slot+slot/2}" y="${height-26}" text-anchor="middle" font-size="8">${htmlEscape(reportFormat(low,item.metricId||metric))}</text>`
    }));
    svg +=
      `<text x="${left+plotW/2}" y="${height-5}" text-anchor="middle" font-size="10">${htmlEscape(series[0]?.label||'Value range')}</text><text x="15" y="${top+plotH/2}" text-anchor="middle" font-size="10" transform="rotate(-90 15 ${top+plotH/2})">Count</text>`;
    return svg + '</svg>'
  }

  function renderTreemapSvg(labels, series, metric, interactionLabels, palette) {
    if (!series) return '<div class="widget-empty">Add one measure to create a treemap.</div>';
    const items = series.values.map((value, index) => ({
      label: labels[index],
      value: Math.max(0, Number(value) || 0),
      index
    })).filter(item => item.value > 0);
    if (!items.length) return '<div class="widget-empty">Treemap requires positive values.</div>';
    const width = 920,
      height = 340,
      rects = [];

    function place(list, x, y, w, h, depth = 0) {
      if (!list.length) return;
      if (list.length === 1) {
        rects.push({
          ...list[0],
          x,
          y,
          w,
          h
        });
        return
      }
      const sum = list.reduce((total, item) => total + item.value, 0);
      let split = 0,
        acc = 0;
      while (split < list.length - 1 && acc < sum / 2) {
        acc += list[split].value;
        split++
      }
      const left = list.slice(0, split),
        right = list.slice(split),
        ratio = left.reduce((total, item) => total + item.value, 0) / sum;
      if (w >= h) {
        place(left, x, y, w * ratio, h, depth + 1);
        place(right, x + w * ratio, y, w * (1 - ratio), h, depth + 1)
      } else {
        place(left, x, y, w, h * ratio, depth + 1);
        place(right, x, y + h * ratio, w, h * (1 - ratio), depth + 1)
      }
    }
    place(items, 0, 0, width, height);
    let svg =
      `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${htmlEscape(metricMeta(metric).label)} treemap">`;
    rects.forEach((item, index) => {
      const pad = 2,
        color = series.pointColors?.[item.index] || palette[index % palette.length];
      svg +=
        `<rect x="${item.x+pad}" y="${item.y+pad}" width="${Math.max(1,item.w-pad*2)}" height="${Math.max(1,item.h-pad*2)}" rx="2" fill="${color}" data-chart-tooltip="${reportTooltipAttribute(series.tooltipPoints?.[item.index]||`${item.label}\n${metricMeta(series.metricId||metric).label}: ${reportFormat(item.value,series.metricId||metric)}`)}" data-report-index="${item.index}" data-report-value="${htmlEscape(interactionLabels[item.index]||item.label||'')}"/>`;
      if (item.w > 74 && item.h > 28) svg +=
        `<text x="${item.x+8}" y="${item.y+18}" font-size="10" fill="${colorHexToHsl(color)[2]>.55?'#302f2b':'#fffdf8'}">${htmlEscape(String(item.label||'').slice(0,22))}</text>`
    });
    return svg + '</svg>'
  }

  function renderBulletSvg(labels, series, metric, interactionLabels, palette, options = {}) {
    const actual = series[0],
      target = series.find(item => item.metricId !== actual?.metricId),
      width = 920,
      rowH = 34,
      height = Math.max(180, 42 + labels.length * rowH),
      left = 180,
      right = 28,
      top = 12,
      plotW = width - left - right,
      max = Math.max(1, ...series.flatMap(item => item.values.filter(Number.isFinite).map(
        Number))),
      x = value => left + Math.max(0, Number(value) || 0) / max * plotW;
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Bullet chart">`;
    labels.forEach((label, index) => {
      const y = top + index * rowH,
        goal = Number(target?.values[index]) || max,
        val = Number(actual?.values[index]) || 0;
      svg +=
        `<text x="${left-8}" y="${y+20}" text-anchor="end" font-size="10">${htmlEscape(String(label).slice(0,28))}</text><rect x="${left}" y="${y+4}" width="${x(goal*.5)-left}" height="24" fill="${options.bulletBandColors?.low||'#eee8fa'}"/><rect x="${x(goal*.5)}" y="${y+4}" width="${x(goal*.8)-x(goal*.5)}" height="24" fill="${options.bulletBandColors?.mid||'#f7dce9'}"/><rect x="${x(goal*.8)}" y="${y+4}" width="${Math.max(1,x(goal)-x(goal*.8))}" height="24" fill="${options.bulletBandColors?.high||'#df82b4'}"/><rect x="${left}" y="${y+10}" width="${Math.max(1,x(val)-left)}" height="12" fill="${palette[0]}" data-chart-tooltip="${reportTooltipAttribute(actual.tooltipPoints?.[index]||`${label}\n${actual.label}: ${reportFormat(val,actual.metricId||metric)}${target?`\n${target.label}: ${reportFormat(goal,target.metricId||metric)}`:''}`)}" data-report-index="${index}" data-report-value="${htmlEscape(interactionLabels[index]||label||'')}"/>${target?`<line x1="${x(goal)}" y1="${y+2}" x2="${x(goal)}" y2="${y+30}" stroke="${palette[3]}" stroke-width="3"/>`:''}`
    });
    return svg + '</svg>'
  }

  function renderCalendarHeatmapSvg(series, metric, options) {
    if (!series)
      return '<div class="widget-empty">Add a date dimension and one measure for a calendar heatmap.</div>';
    const dates = options.calendarDates || [],
      values = series.values,
      max = values.reduce((best, value) => Number.isFinite(value) ? Math.max(best, Math.abs(
        value)) : best, 1),
      cell = 16,
      gap = 3,
      first = new Date((dates[0] || '1970-01-01') + 'T00:00:00'),
      offset = first.getDay(),
      weeks = Math.ceil((values.length + offset) / 7),
      vertical = options.calendarOrientation === 'vertical',
      width = Math.max(320, (vertical ? 7 : weeks) * (cell + gap) + 60),
      height = (vertical ? weeks : 7) * (cell + gap) + 52;
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Calendar heatmap">`;
    values.forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      const d = new Date((dates[index] || dates[0] || '1970-01-01') + 'T00:00:00'),
        day = d.getDay(),
        week = Math.floor((index + offset) / 7),
        strength = Math.min(.94, .12 + .82 * Math.abs(value) / max),
        color = series.color || '#4e2a84',
        cx = 42 + (vertical ? day : week) * (cell + gap),
        cy = 20 + (vertical ? week : day) * (cell + gap);
      svg +=
        `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="3" fill="${color}" fill-opacity="${strength}" data-chart-tooltip="${reportTooltipAttribute(series.tooltipPoints?.[index]||`${dates[index]}\n${metricMeta(series.metricId||metric).label}: ${reportFormat(value,series.metricId||metric)}`)}" data-report-index="${index}" data-report-value="${htmlEscape(dates[index]||'')}"/>`
    });
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day, index) => svg += vertical ?
      `<text x="${47+index*(cell+gap)}" y="14" text-anchor="middle" font-size="8">${day}</text>` :
      `<text x="35" y="${31+index*(cell+gap)}" text-anchor="end" font-size="8">${day}</text>`);
    return svg + '</svg>'
  }

  function renderPieSvg(labels, series, metric, interactionLabels = labels, dimension = 'date',
    palette = REPORT_CHART_PALETTE, donut = false) {
    if (!series) return '<div class="widget-empty">No values to chart.</div>';
    const vals = series.values.map(v => Math.max(0, Number(v) || 0)),
      total = vals.reduce((a, b) => a + b, 0);
    if (total <= 0)
      return '<div class="widget-empty">Pie and Donut charts require positive values.</div>';
    if (vals.filter(v => v > 0).length === 1) {
      const i = vals.findIndex(v => v > 0);
      return `<svg viewBox="0 0 240 240" role="img" aria-label="${htmlEscape(metricMeta(metric).label)} ${donut?'donut':'pie'} chart"><circle cx="120" cy="120" r="95" fill="${reportSeriesColor(`dimension:${dimension}:${labels[i]}`,palette)}" data-chart-tooltip="${reportTooltipAttribute(series.tooltipPoints?.[i]||`${labels[i]}\n${metricMeta(metric).label}: ${reportFormat(vals[i],metric)}`)}" data-report-index="${series.reportIndices?.[i]??i}" data-report-value="${htmlEscape(interactionLabels[i]||labels[i])}"></circle>${donut?'<circle cx="120" cy="120" r="56" fill="#fffdf8" class="donut-hole" pointer-events="none"/>':''}</svg>`
    }
    let angle = -Math.PI / 2,
      paths = '';
    vals.forEach((v, i) => {
      const color = reportSeriesColor(`dimension:${dimension}:${labels[i]}`, palette);
      if (!v) return;
      const next = angle + v / total * Math.PI * 2,
        x1 = 120 + 95 * Math.cos(angle),
        y1 = 120 + 95 * Math.sin(angle),
        x2 = 120 + 95 * Math.cos(next),
        y2 = 120 + 95 * Math.sin(next),
        large = next - angle > Math.PI ? 1 : 0;
      paths +=
        `<path d="M120 120 L${x1} ${y1} A95 95 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fffdf8" stroke-width="1.5" data-chart-tooltip="${reportTooltipAttribute(series.tooltipPoints?.[i]||`${labels[i]}\n${metricMeta(metric).label}: ${reportFormat(v,metric)}`)}" data-report-index="${series.reportIndices?.[i]??i}" data-report-value="${htmlEscape(interactionLabels[i]||labels[i])}"></path>`;
      if (v / total >= .045) {
        const mid = (angle + next) / 2,
          radius = donut ? 77 : 64;
        const light = colorHexToHsl(color)[2] > .55;
        paths +=
          `<text x="${120+radius*Math.cos(mid)}" y="${120+radius*Math.sin(mid)}" text-anchor="middle" font-size="8" fill="${light?'#302f2b':'#fffdf8'}" pointer-events="none">${htmlEscape(String(labels[i]).slice(0,14))}</text>`;
      }
      angle = next
    });
    return `<svg viewBox="0 0 240 240" role="img" aria-label="${htmlEscape(metricMeta(metric).label)} ${donut?'donut':'pie'} chart">${paths}${donut?'<circle cx="120" cy="120" r="56" fill="#fffdf8" class="donut-hole" pointer-events="none"/>':''}</svg>`
  }

  function fieldType(table, column) {
    if (DATE_FIELDS.has(column)) return 'date';
    if (NUMERIC_FIELDS.has(column) && !column.endsWith('_id')) return 'number';
    return 'string'
  }

  function validateFormulaColumns(expression) {
    for (const match of String(expression || '').matchAll(
        /\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/g)) {
      if (!COLUMNS[match[1]]?.includes(match[2])) throw new Error(
        `Unknown field reference [${match[1]}.${match[2]}].`)
    }
    return true
  }

  function validateFormulaSyntax(expression, owner) {
    const sample = String(expression || '').replace(/\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/g,
      'null').replace(/\[dimension:[a-zA-Z_][a-zA-Z0-9_]*\]/g, "'Sample'").replace(
      /\{\{[^}]+\}\}/g, '1');
    try {
      evaluateExpression(sample, {})
    } catch (error) {
      throw new Error('Invalid SQL expression in ' + owner + ': ' + error.message)
    }
    return true
  }

  function validateCustomDimensionReferences(expression, available, owner) {
    for (const match of String(expression || '').matchAll(
        /\[dimension:([a-zA-Z_][a-zA-Z0-9_]*)\]/g)) {
      const name = match[1].toLowerCase(),
        found = available.some(dim => dim.lookmlName?.toLowerCase() === name || lookmlIdentifier(
          dim.name) === name);
      if (!found) throw new Error('Unknown or not-yet-defined dimension reference ${' + match[1] +
        '} in ' + owner + '. Define the dimension or date before using it.')
    }
    return true
  }

  function validateCustomMeasureReferences(expression, available, owner) {
    for (const match of String(expression || '').matchAll(/\{\{([^}]+)\}\}/g)) {
      const name = match[1].trim().toLowerCase(),
        found = available.some(metric => metric.lookmlName?.toLowerCase() === name || metric.id
          .toLowerCase() === name || metric.label.toLowerCase() === name) || Object.keys(
          REPORT_METRICS).some(key => key.toLowerCase() === name || REPORT_METRICS[key].label
          .toLowerCase() === name);
      if (!found) throw new Error('Unknown measure reference {{' + match[1] + '}} in ' + owner +
        '. Define the measure before using it.')
    }
    return true
  }

  function validateDefinitionDependencyGraph(dimensions, measures) {
    const nodes = new Map(),
      dimensionAliases = new Map(),
      measureAliases = new Map();
    for (const dim of dimensions) {
      const key = 'dimension:' + dim.id;
      nodes.set(key, {
        key,
        label: 'dimension ' + (dim.lookmlName || dim.name),
        refs: dim.caseExpr || ''
      });
      for (const alias of [dim.id, dim.lookmlName, lookmlIdentifier(dim.name)])
        if (alias) dimensionAliases.set(alias.toLowerCase(), key)
    }
    for (const metric of measures) {
      const key = 'measure:' + metric.id;
      nodes.set(key, {
        key,
        label: 'measure ' + (metric.lookmlName || metric.label),
        refs: metric.formula || ''
      });
      for (const alias of [metric.id, metric.lookmlName, lookmlIdentifier(metric.label)])
        if (alias) measureAliases.set(alias.toLowerCase(), key);
      if (metric.kind === 'ratio') {
        for (const id of [metric.numerator, metric.denominator]) {
          const dep = measures.find(item => item.id === id);
          if (dep) nodes.get(key).refs += ` {{${dep.lookmlName||dep.id}}}`
        }
      }
    }
    const edges = new Map([...nodes.keys()].map(key => [key, []]));
    for (const node of nodes.values()) {
      for (const match of node.refs.matchAll(/\[dimension:([a-zA-Z_][a-zA-Z0-9_]*)\]/g)) {
        const target = dimensionAliases.get(match[1].toLowerCase());
        if (target) edges.get(node.key).push(target)
      }
      for (const match of node.refs.matchAll(/\{\{([^}]+)\}\}/g)) {
        const target = measureAliases.get(match[1].trim().toLowerCase());
        if (target) edges.get(node.key).push(target)
      }
    }
    const state = new Map(),
      path = [];

    function visit(key) {
      if (state.get(key) === 2) return;
      if (state.get(key) === 1) {
        const start = path.indexOf(key),
          cycle = [...path.slice(start), key].map(item => nodes.get(item)?.label || item);
        throw new Error('Circular definition dependency: ' + cycle.join(' → '))
      }
      state.set(key, 1);
      path.push(key);
      for (const target of edges.get(key) || []) visit(target);
      path.pop();
      state.set(key, 2)
    }
    for (const key of nodes.keys()) visit(key);
    return true
  }

  function fieldSample(source) {
    const [table, column] = String(source || '').split('.'), row = tables?.[table]?.preview?.find(
      r => r[column] != null);
    return row ? {
      row,
      rowMap: {
        [table]: row
      },
      value: row[column]
    } : null
  }

  function addDefinitionHistory(kind, label, action) {
    definitionHistory.unshift({
      ts: new Date().toISOString(),
      kind,
      label,
      action
    });
    definitionHistory = definitionHistory.slice(0, 30)
  }

  function persistDefinitionHistory() {
    try {
      localStorage.setItem('syntheticGeneratorDefinitionHistory', JSON.stringify(
        definitionHistory))
    } catch (e) {
      console.warn('Could not save definition history', e)
    }
  }

  function dimensionLabel(id) {
    if (id === 'date') return 'Date';
    const item = customAttributes.find(a => a.id === id);
    return dictionaryFieldName(item, id, 'dimension')
  }

  function metricOptionsHtml() {
    return customMetrics.map(m =>
      `<option value="${m.id}" title="${htmlEscape(m.description||`${fieldLabel(m.id,'metric')} · ${m.format} · Custom measure`)}">${htmlEscape(fieldLabel(m.id,'metric'))}</option>`
    ).join('')
  }

  function dimensionOptionsHtml(includeNone = false) {
    let html = includeNone ? '<option value="none">No breakdown</option>' : '';
    return html + customAttributes.map(a =>
      `<option value="${a.id}">${htmlEscape(fieldLabel(a.id,'dimension'))}</option>`).join('')
  }
  const DICTIONARY_HANDLE_DB = 'subscriptionDataStudioFiles';

  function openDictionaryHandleDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('Persistent file handles are unavailable.'));
        return
      }
      const request = indexedDB.open(DICTIONARY_HANDLE_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('handles');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error)
    })
  }
  async function getDictionaryFileHandle() {
    const db = await openDictionaryHandleDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('handles', 'readonly').objectStore('handles').get(
        'dictionary');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error)
    })
  }
  async function storeDictionaryFileHandle(handle) {
    const db = await openDictionaryHandleDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('handles', 'readwrite');
      transaction.objectStore('handles').put(handle, 'dictionary');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error)
    })
  }

  function dictionarySidecarSource(definitionText) {
    const payload = {
      format: 'subscription-data-dictionary',
      version: 1,
      saved: true,
      savedAt: new Date().toISOString(),
      definitionText: String(definitionText || '')
    };
    return `window.__SUBSCRIPTION_GENERATOR_DICTIONARY__ = ${JSON.stringify(payload,null,2)};\n`
  }

  function parseDictionarySidecar(source) {
    const prefix = 'window.__SUBSCRIPTION_GENERATOR_DICTIONARY__ = ';
    const text = String(source || '').trim();
    if (!text.startsWith(prefix)) throw new Error(
      'This is not a Subscription Data Dictionary file.');
    return JSON.parse(text.slice(prefix.length).replace(/;\s*$/, ''))
  }

  function mergeDictionarySources(defaultText, savedText) {
    try {
      const baseline = parseLookmlDefinitions(defaultText || ''),
        saved = parseLookmlDefinitions(savedText || ''),
        keys = new Set(saved.map(block => `${block.kind}:${block.id.toLowerCase()}`)),
        merged = [...saved, ...baseline.filter(block => !keys.has(
          `${block.kind}:${block.id.toLowerCase()}`))];
      const parameterBlocks = new Map();
      for (const text of [defaultText, savedText])
        for (const match of String(text || '').matchAll(
            /^\s*parameter\s*:\s*([A-Za-z_]\w*)\s*\{[^{}]*\}/gm)) parameterBlocks.set(match[1],
          match[0]);
      return [...parameterBlocks.values(), ...merged.map(block => block.raw)].join('\n\n')
    } catch (error) {
      console.warn('Could not merge saved definitions with the project defaults:', error);
      return String(savedText || defaultText || '')
    }
  }

  function applyProjectDictionaryText(text) {
    const editor = $('definitionEditor');
    if (!editor) return;
    editor.value = mergeDictionarySources(window.__SUBSCRIPTION_GENERATOR_DICTIONARY__
      ?.definitionText, text);
    editor.dataset.initialized = 'true';
    persistDictionaryDraft(editor.value);
    if (editor.value.trim()) {
      const resolved = resolveLookmlDefinitions(editor.value);
      customAttributes = resolved.dimensions;
      customMetrics = resolved.measures;
      const status = $('definitionStatus');
      if (status) {
        status.textContent =
          `Loaded ${customAttributes.length} dimensions (${customAttributes.filter(item=>item.type==='date').length} dates) and ${customMetrics.length} measures.`;
        status.classList.remove('error')
      }
    } else {
      customAttributes = [];
      customMetrics = []
    }
    invalidateReportsForDictionaryChange();
    persistDefinitionHistory();
    renderDictionary();
    renderSheet();
    persistReporting()
  }
  async function restoreProjectDictionaryFile() {
    try {
      if (hadStoredWorkspace && typeof JSON.parse(localStorage.getItem(
          'syntheticGeneratorReporting') || '{}')
        .appliedDefinitionText === 'string') return;
      dictionaryProjectHandle = await getDictionaryFileHandle();
      if (!dictionaryProjectHandle) return;
      const permission = await dictionaryProjectHandle.queryPermission({
        mode: 'readwrite'
      });
      if (permission !== 'granted') return;
      const file = await dictionaryProjectHandle.getFile(),
        payload = parseDictionarySidecar(await file.text());
      if (payload.format === 'subscription-data-dictionary' && payload.version === 1 && payload
        .saved && typeof payload.definitionText === 'string') {
        applyProjectDictionaryText(payload.definitionText);
        toast('Loaded Data Dictionary definitions from the project file.')
      }
    } catch (error) {
      console.warn('Could not restore the project Data Dictionary file:', error)
    }
  }
  async function saveDictionarySidecar(definitionText) {
    const content = dictionarySidecarSource(definitionText);
    let handle = dictionaryProjectHandle;
    if (handle) {
      let permission = await handle.queryPermission({
        mode: 'readwrite'
      });
      if (permission !== 'granted') permission = await handle.requestPermission({
        mode: 'readwrite'
      });
      if (permission !== 'granted') handle = null
    }
    if (!handle && window.showSaveFilePicker) {
      handle = await window.showSaveFilePicker({
        suggestedName: 'data_dictionary_definitions.js',
        types: [{
          description: 'Subscription Data Dictionary',
          accept: {
            'text/javascript': ['.js']
          }
        }]
      })
    }
    if (handle) {
      const writer = await handle.createWritable();
      await writer.write(content);
      await writer.close();
      dictionaryProjectHandle = handle;
      try {
        await storeDictionaryFileHandle(handle)
      } catch (error) {
        console.warn('Could not remember the Data Dictionary file handle:', error)
      }
      window.__SUBSCRIPTION_GENERATOR_DICTIONARY__ = parseDictionarySidecar(content);
      toast(
        'Definitions saved to data_dictionary_definitions.js. Keep it with the project to use them in another environment.'
      );
      return
    }
    download('data_dictionary_definitions.js', content, 'text/javascript');
    window.__SUBSCRIPTION_GENERATOR_DICTIONARY__ = parseDictionarySidecar(content);
    toast(
      'Definitions file downloaded. Keep it beside the generator HTML so it loads with the project.'
    )
  }

  function persistDictionaryDraft(text) {
    try {
      localStorage.setItem('syntheticGeneratorDictionaryDraft', String(text ?? ''))
    } catch (e) {
      console.warn('Could not save Data Dictionary draft', e)
    }
  }

  function persistEvaluationDraft(text) {
    try {
      localStorage.setItem('syntheticGeneratorEvaluationDraft', String(text ?? ''))
    } catch (e) {
      console.warn('Could not save evaluation draft', e)
    }
  }

  function createInstanceId() {
    return globalThis.crypto?.randomUUID?.() ||
      `SDS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`
  }

  // Workspace persistence and report module configuration
  function persistReporting() {
    captureReportHistory();
    try {
      if (!localStorage.getItem('syntheticGeneratorInstanceId')) localStorage.setItem(
        'syntheticGeneratorInstanceId', createInstanceId());
      document.cookie =
        `sds_instance_id=${encodeURIComponent(localStorage.getItem('syntheticGeneratorInstanceId'))}; path=/; max-age=31536000; SameSite=Lax`;
      const savedSheets = reportSheets.map(s => ({
        ...s,
        widgets: s.widgets.map(w => {
          const {
            lastSpreadsheetCsvRows,
            lastHtml,
            lastKpis,
            lastStatus,
            lastSubtitle,
            lastRunId,
            lastDefinitionRevision,
            lastCalculationInspection,
            ...config
          } = w;
          return config
        })
      }));
      localStorage.setItem('syntheticGeneratorReporting', JSON.stringify({
        customAttributes,
        customMetrics,
        appliedDefinitionText: serializeLookmlDefinitions(),
        reportSheets: savedSheets,
        activeSheetId,
        sheetCounter,
        reportSidebarWidth,
        sidebarLayoutVersion: 3,
        definitionVersions,
        definitionText: $('definitionEditor')?.value || '',
        evaluationText: $('evaluationCode')?.value || '',
        evaluationSampleCount: $('evaluationSampleCount')?.value || '5'
      }));
      if ($('reportSaveState')) $('reportSaveState').textContent = 'Saved in this browser';
    } catch (e) {
      if ($('reportSaveState')) $('reportSaveState').textContent = 'Not saved — use Save Studio';
      console.warn('Could not save reporting setup', e)
    }
  }

  function loadReporting() {
    try {
      const hasSavedWorkspace = !!localStorage.getItem('syntheticGeneratorReporting'),
        saved = JSON.parse(localStorage.getItem('syntheticGeneratorReporting') || '{}'),
        defaults = window.__SUBSCRIPTION_STUDIO_DEFAULTS__;
      if (Array.isArray(saved.definitionVersions)) definitionVersions = saved.definitionVersions
        .slice(-10);
      if (!hasSavedWorkspace && defaults?.format === 'subscription-data-studio-instance' &&
        defaults.workspace) {
        const initial = defaults.workspace;
        customAttributes = initial.customAttributes || [];
        customMetrics = initial.customMetrics || [];
        reportSheets = initial.reportSheets || reportSheets;
        activeSheetId = initial.activeSheetId || reportSheets[0]?.id || 'sheet_1';
        sheetCounter = Number(initial.sheetCounter) || reportSheets.length
      }
      if (Array.isArray(saved.customAttributes)) customAttributes = saved.customAttributes;
      if (Array.isArray(saved.customMetrics)) customMetrics = saved.customMetrics;
      if (Array.isArray(saved.reportSheets) && saved.reportSheets.length) reportSheets = saved
        .reportSheets.filter(sheet => !(sheet.id === 'sheet_2' && sheet.name === 'Sheet 2' && !(
          sheet.widgets || []).length && !(sheet.filters || []).length));
      if (!reportSheets.length) reportSheets = [{
        id: 'sheet_1',
        name: 'Sheet 1',
        widgets: []
      }];
      if (saved.activeSheetId) activeSheetId = saved.activeSheetId;
      if (saved.sheetCounter) sheetCounter = saved.sheetCounter;
      reportSidebarWidth = restoredSidebarWidth(saved.reportSidebarWidth, saved
        .sidebarLayoutVersion);
      for (const sheet of reportSheets) {
        sheet.filters = Array.isArray(sheet.filters) ? sheet.filters : [];
        sheet.filterDraft = Array.isArray(sheet.filterDraft) ? sheet.filterDraft : JSON.parse(JSON
          .stringify(sheet.filters));
        for (const widget of sheet.widgets || []) {
          if (!widget.lastHtml && widget.kind !== 'placeholder') widget.needsRefresh = true
        }
      }
      definitionHistory = JSON.parse(localStorage.getItem(
        'syntheticGeneratorDefinitionHistory') || '[]');
      const editor = $('definitionEditor'),
        projectDictionary = window.__SUBSCRIPTION_GENERATOR_DICTIONARY__;
      let dictionaryDraft = localStorage.getItem('syntheticGeneratorDictionaryDraft') ?? saved
        .definitionText ?? projectDictionary?.definitionText;
      if (typeof projectDictionary?.definitionText === 'string' && typeof saved
        .appliedDefinitionText !== 'string') dictionaryDraft =
        mergeDictionarySources(projectDictionary.definitionText, dictionaryDraft);
      if (editor && typeof dictionaryDraft === 'string') {
        editor.value = dictionaryDraft;
        editor.dataset.initialized = 'true';
        if (dictionaryDraft.trim() || typeof saved.appliedDefinitionText === 'string') {
          try {
            const restored = resolveLookmlDefinitions(saved.appliedDefinitionText ??
              dictionaryDraft);
            customAttributes = restored.dimensions;
            customMetrics = restored.measures;
            const status = $('definitionStatus');
            if (status) {
              status.textContent =
                `Loaded ${customAttributes.length} dimensions (${customAttributes.filter(item=>item.type==='date').length} dates) and ${customMetrics.length} measures.`;
              status.classList.remove('error')
            }
          } catch (error) {
            console.warn('Keeping last valid dictionary definitions; draft needs correction:',
              error.message);
            const status = $('definitionStatus');
            if (status) {
              status.textContent =
                `Dictionary definitions could not be fully loaded: ${error.message}`;
              status.classList.add('error')
            }
          }
        }
      }
      const evaluation = $('evaluationCode'),
        evaluationDraft = localStorage.getItem('syntheticGeneratorEvaluationDraft') ?? saved
        .evaluationText;
      if (evaluation && typeof evaluationDraft === 'string') evaluation.value = evaluationDraft;
      if (saved.evaluationSampleCount && $('evaluationSampleCount')) $('evaluationSampleCount')
        .value = saved.evaluationSampleCount;
      persistReporting()
    } catch (e) {
      console.warn('Could not load reporting setup', e)
    }
  }

  function activeSheet() {
    let sheet = reportSheets.find(item => item.id === activeSheetId);
    if (!sheet) {
      sheet = {
        id: activeSheetId || 'sheet_1',
        name: 'Sheet 1',
        widgets: [],
        filters: [],
        dateRange: {
          period: 'ytd'
        }
      };
      reportSheets.push(sheet);
      activeSheetId = sheet.id
    }
    sheet.widgets = Array.isArray(sheet.widgets) ? sheet.widgets : [];
    const legacyFilters = Array.isArray(sheet.filters) ? sheet.filters : [],
      legacyDraft = Array.isArray(sheet.filterDraft) ? sheet.filterDraft : legacyFilters,
      legacyDateRange = sheet.dateRange && typeof sheet.dateRange === 'object' ? sheet.dateRange :
      {
        period: 'ytd'
      };
    for (const widget of sheet.widgets) {
      const config = widget.config || (widget.config = {
        xFields: [],
        yFields: [],
        chartType: 'bar'
      });
      if (!Array.isArray(config.filters)) config.filters = JSON.parse(JSON.stringify(
        legacyFilters));
      if (!Array.isArray(config.filterDraft)) config.filterDraft = JSON.parse(JSON.stringify(
        legacyDraft));
      if (!config.dateRange || typeof config.dateRange !== 'object') config.dateRange = JSON
        .parse(JSON.stringify(legacyDateRange));
      if (!config.dateRangeDraft || typeof config.dateRangeDraft !== 'object') config
        .dateRangeDraft = JSON.parse(JSON.stringify(config.dateRange));
      delete config.period;
      delete config.drillLevel
    }
    sheet.filters = [];
    sheet.filterDraft = [];
    delete sheet.dateRange;
    return sheet
  }

  function widgetElement(id) {
    return document.querySelector(
      `#reportCharts > .report-widget[data-widget-id="${CSS.escape(String(id))}"]`)
  }

  function markWidgetStale(widget) {
    if (widget.kind === 'placeholder') return;
    widget.needsRefresh = true;
    const el = widgetElement(widget.id);
    if (el) {
      el.classList.add('needs-refresh');
      const status = el.querySelector('.widget-status');
      if (status) {
        status.textContent = 'Needs refresh — click Refresh.';
        status.classList.add('needs-refresh')
      }
    }
  }

  function markSheetWidgetsStale(sheet = activeSheet()) {
    sheet.widgets.forEach(markWidgetStale)
  }

  function invalidateReportsForDictionaryChange() {
    definitionRevision++;
    for (const sheet of reportSheets)
      for (const widget of sheet.widgets || []) {
        if (widget.kind === 'placeholder') continue;
        widget.needsRefresh = true;
        widget.lastRunId = null;
        widget.lastDefinitionRevision = null;
        markWidgetStale(widget)
      }
    persistReporting()
  }

  function reportSidebarTotalWidth() {
    return document.body.classList.contains('report-setup-visible') && innerWidth > 900 ?
      reportSidebarWidth * 2 + 12 : reportSidebarWidth;
  }

  function updateReportSetupLayout(visible) {
    document.body.classList.toggle('report-setup-visible', !!visible);
    document.querySelector('main.shell').style.setProperty('--report-sidebar-total-width',
      `${reportSidebarTotalWidth()}px`);
    updateReportSidebarPin();
  }

  function updateReportSidebarPin(reset = false) {
    const sidebar = document.querySelector('#reportingView .mockup3-report-sidebar'),
      grid = sidebar?.closest('.report-grid');
    if (!sidebar || !grid) return;
    if (!document.body.classList.contains('reporting-active') || document.body.classList.contains(
        'presentation-mode') || innerWidth <= 900) {
      sidebar.classList.remove('report-sidebar-pinned');
      grid.classList.remove('report-sidebar-pinned-layout');
      sidebar.style.removeProperty('--report-sidebar-fixed-left');
      sidebar.style.removeProperty('--report-sidebar-fixed-width');
      grid.style.removeProperty('--report-sidebar-reserved-height');
      delete sidebar.dataset.pinAt;
      return;
    }
    const pageScroll = window.scrollY || 0,
      gridRect = grid.getBoundingClientRect();
    // The grid stays in flow even while the sidebar is fixed. Never anchor to the fixed sidebar.
    sidebar.dataset.pinAt = String(gridRect.top + pageScroll);
    const shouldPin = gridRect.top <= 12;
    if (shouldPin) {
      const naturalHeight = sidebar.classList.contains('report-sidebar-pinned') ?
        sidebar.scrollHeight + parseFloat(getComputedStyle(sidebar).borderTopWidth || 0) +
        parseFloat(getComputedStyle(sidebar).borderBottomWidth || 0) :
        sidebar.getBoundingClientRect().height;
      // Retain the sidebar's natural footprint so pinning cannot shorten the page and clamp scrollY.
      const reserved = Math.max(naturalHeight, parseFloat(grid.style.getPropertyValue(
        '--report-sidebar-reserved-height')) || 0);
      grid.style.setProperty('--report-sidebar-reserved-height', reserved + 'px');
      sidebar.style.setProperty('--report-sidebar-fixed-left', gridRect.left + 'px');
      sidebar.style.setProperty('--report-sidebar-fixed-width', reportSidebarTotalWidth() + 'px');
      grid.classList.add('report-sidebar-pinned-layout');
      sidebar.classList.add('report-sidebar-pinned');
    } else {
      sidebar.classList.remove('report-sidebar-pinned');
      grid.classList.remove('report-sidebar-pinned-layout');
      sidebar.style.removeProperty('--report-sidebar-fixed-left');
      sidebar.style.removeProperty('--report-sidebar-fixed-width');
      grid.style.removeProperty('--report-sidebar-reserved-height');
    }
    positionSelectedModuleToolbar();
  }

  function restoredSidebarWidth(value, version) {
    if (version === 2) return Math.max(200, Math.min(320, Number(value) || 240)) * 1.5;
    return version >= 3 ? Math.max(300, Math.min(480, Number(value) || 360)) : 360;
  }

  function applyReportSidebarWidth(save = true) {
    const grid = document.querySelector('#reportingView .report-grid');
    if (!grid) return;
    reportSidebarWidth = Math.max(300, Math.min(480, Number(reportSidebarWidth) || 360));
    grid.style.setProperty('--report-sidebar-width', `${reportSidebarWidth}px`);
    document.querySelector('main.shell').style.setProperty('--report-sidebar-width',
      `${reportSidebarWidth}px`);
    const grip = $('reportSidebarResizer');
    if (grip) {
      grip.setAttribute('aria-valuemin', '300');
      grip.setAttribute('aria-valuemax', '480');
      grip.setAttribute('aria-valuenow', String(reportSidebarWidth))
    }
    document.querySelector('main.shell').style.setProperty('--report-sidebar-total-width',
      `${reportSidebarTotalWidth()}px`);
    updateReportSidebarPin();
    positionSelectedModuleToolbar();
    if (save) {
      try {
        localStorage.setItem('syntheticGeneratorReportSidebarWidth', String(reportSidebarWidth))
      } catch (e) {}
    }
  }

  function beginReportSidebarResize(event) {
    if (event.target.closest('#reportSidebarResizer') !== event.currentTarget) return;
    event.preventDefault();
    sidebarResizeState = {
      startX: event.clientX,
      startWidth: reportSidebarWidth
    };
    document.body.classList.add('resizing-report-sidebar')
  }

  function resizeReportSidebar(event) {
    if (!sidebarResizeState) return;
    reportSidebarWidth = sidebarResizeState.startWidth + (event.clientX - sidebarResizeState
      .startX);
    applyReportSidebarWidth(false)
  }

  function finishReportSidebarResize() {
    if (!sidebarResizeState) return;
    sidebarResizeState = null;
    document.body.classList.remove('resizing-report-sidebar');
    applyReportSidebarWidth(true);
    persistReporting()
  }

  function saveModuleDisclosure(event) {
    const disclosure = event.target.closest?.('[data-module-collapse]');
    if (!disclosure) return;
    const widget = activeSheet().widgets.find(item => item.id === disclosure.dataset.widgetId);
    if (!widget) return;
    widget.config[({
      configuration: 'configurationExpanded',
      axes: 'axesExpanded',
      filters: 'filtersExpanded'
    })[disclosure.dataset.moduleCollapse] || 'configurationExpanded'] = disclosure.open;
    persistReporting()
  }

  const DATE_DRILL_LABELS = {
    year: 'Year',
    month: 'Month',
    week: 'Week',
    day: 'Date'
  };

  function dateDrillControls(config) {
    const plan = axisPlan(config),
      dateId = plan.categoryDims.length === 1 && isFullDateDimension(plan.categoryDims[0]) ? plan
      .categoryDims[0] : null;
    if (!dateId || ['metric_card', 'calendar_heatmap'].includes(config.chartType)) return '';
    const order = ['day', 'week', 'month', 'year'],
      level = config.dateDrillLevel || 'day',
      index = order.indexOf(level);
    const label = level === 'day' ? 'Individual Dates' : DATE_DRILL_LABELS[level];
    return `<div class="module-date-drill"><button type="button" data-date-drill-step="-1" aria-label="${index>0?'Expand to '+DATE_DRILL_LABELS[order[index-1]]:'Already at individual dates'}" title="${index>0?'Expand to '+DATE_DRILL_LABELS[order[index-1]]:'Individual dates'}"${index<=0?' disabled':''}>←</button><span>${htmlEscape(dimensionLabel(dateId))} · ${htmlEscape(label)}</span><button type="button" data-date-drill-step="1" aria-label="${index<3?'Group by '+DATE_DRILL_LABELS[order[index+1]]:'Already grouped by year'}" title="${index<3?'Group by '+DATE_DRILL_LABELS[order[index+1]]:'Year'}"${index>=3?' disabled':''}>→</button></div>`;
  }

  async function redrawDisplayedReport(widget, presentationChanges = {}) {
    const snapshot = reportDisplaySnapshots.get(widget.id),
      el = widgetElement(widget.id);
    if (!snapshot || !el || snapshot.run !== appState?.runId || snapshot.revision !==
      definitionRevision) {
      toast('Refresh this module once to display its results before sorting.');
      return;
    }
    const displayConfig = {
      ...JSON.parse(JSON.stringify(snapshot.config)),
      paletteId: widget.config.paletteId,
      axisScale: widget.config.axisScale,
      autoFitValueAxis: widget.config.autoFitValueAxis,
      valueAxisMinimum: widget.config.valueAxisMinimum,
      lineMarker: widget.config.lineMarker,
      lineShape: widget.config.lineShape,
      tickInterval: widget.config.tickInterval,
      showGrandTotal: widget.config.showGrandTotal,
      showSubtotals: widget.config.showSubtotals,
      ...presentationChanges,
      useCapturedParameters: true
    };
    for (const axis of ['xFields', 'yFields'])
      for (const field of displayConfig[axis] || []) {
        field.sortDirection = widget.config[axis]?.find(item => item.kind === field.kind && item
          .id === field.id)?.sortDirection || '';
      }
    const token = (reportRunTokens.get(widget.id) || 0) + 1;
    reportRunTokens.set(widget.id, token);
    reportDisplayOverrides.set(widget.id, snapshot.aggregates);
    try {
      await buildReport(displayConfig, el, token);
      widget.lastHtml = el.querySelector('.widget-content').innerHTML;
      widget.lastStatus = el.querySelector('.widget-status').textContent;
      persistReporting();
    } catch (error) {
      toast(`Could not update sorting: ${error.message}`);
    } finally {
      reportDisplayOverrides.delete(widget.id);
    }
  }

  async function updateDateDrill(widget, level, focus = undefined) {
    const valid = ['year', 'month', 'week', 'day'];
    if (!valid.includes(level)) return;
    const request = (dateDrillRequests.get(widget.id) || 0) + 1;
    dateDrillRequests.set(widget.id, request);
    widget.config.dateDrillLevel = level;
    if (focus !== undefined) widget.config.dateDrillFocus = focus;
    const previous = reportRefreshFlights.get(widget.id);
    if (previous) await previous;
    if (dateDrillRequests.get(widget.id) !== request) return;
    markWidgetStale(widget);
    persistReporting();
    renderSheet();
    await refreshWidget(widget);
  }

  function handleDateDrill(event) {
    if (event.type !== 'click') return;
    const button = event.target.closest('[data-date-drill-step]');
    if (!button || button.disabled) return;
    const widget = activeSheet().widgets.find(item => item.id === button.closest('.report-widget')
      ?.dataset.widgetId);
    if (!widget) return;
    const order = ['day', 'week', 'month', 'year'];
    const index = order.indexOf(widget.config.dateDrillLevel || 'day');
    const next = order[index + Number(button.dataset.dateDrillStep)];
    if (!next) return;
    widget.config.dateDrillHistory = [];
    void updateDateDrill(widget, next, null);
  }

  function moduleFieldPills(fields, axis) {
    return fields.map((field, index) => {
      const name = fieldLabel(field.id, field.kind),
        sort = field.sortDirection || '',
        isDate = field.kind === 'dimension' && (() => {
          const item = customAttributes.find(dim => dim.id === field.id),
            parts = (item?.source || '').split('.');
          return item?.type === 'date' || (parts.length === 2 && fieldType(...parts) ===
            'date')
        })();
      return `<span class="dictionary-chip axis-field-chip" draggable="true" title="${htmlEscape(name)} · Drag to reorder" data-axis-field="${index}" data-axis="${axis}" data-field-kind="${field.kind}" data-field-id="${htmlEscape(field.id)}">${field.kind==='dimension'?'◇':'ƒ'} <span class="axis-field-name">${htmlEscape(name)}</span><select class="axis-sort-select" data-axis-sort="${axis}:${index}" aria-label="Sort ${htmlEscape(name)}" title="Sort ${htmlEscape(name)}">${field.kind==='metric'?`<option value=""${!sort?' selected':''}>No sort</option><option value="ascending"${sort==='ascending'?' selected':''}>Low → High</option><option value="descending"${sort==='descending'?' selected':''}>High → Low</option>`:`<option value="ascending"${sort==='ascending'?' selected':''}>${isDate?'Earliest → Latest':'A → Z'}</option><option value="descending"${sort==='descending'?' selected':''}>${isDate?'Latest → Earliest':'Z → A'}</option>`}</select><button type="button" data-remove-axis="${axis}:${index}" aria-label="Remove ${htmlEscape(name)}">×</button></span>`
    }).join('')
  }

  function fieldLabel(id, kind) {
    const metric = kind === 'metric' ? customMetrics.find(item => item.id === id) : null,
      dimension = kind === 'dimension' ? customAttributes.find(item => item.id === id) : null;
    return dictionaryFieldName(metric || dimension, id, kind)
  }

  function constrainAxisFields(fields) {
    const active = fields.some(field => field.kind === 'metric' && customMetrics.some(item => item
      .id === field.id));
    if (!active) return fields;
    let keptDimension = false;
    return fields.filter(field => {
      if (field.kind !== 'dimension' || !customAttributes.some(item => item.id === field.id))
        return true;
      if (keptDimension) return false;
      keptDimension = true;
      return true
    })
  }

  function moduleFiltersChanged(widget) {
    return JSON.stringify(widget?.config?.filters || []) !== JSON.stringify(widget?.config
      ?.filterDraft || [])
  }

  function renderModuleFilterActions(widget) {
    const card = widgetElement(widget.id);
    if (!card) return;
    const apply = card.querySelector('[data-module-filter-action="apply"]'),
      clear = card.querySelector('[data-module-filter-action="clear"]');
    if (apply) apply.disabled = !moduleFiltersChanged(widget);
    if (clear) clear.disabled = !(widget.config.filters.length || widget.config.filterDraft
      .length)
  }

  // Compatibility is limited to the known daily subscription-start rename, not arbitrary dates.
  function resolveReportDateReference(id) {
    if (customAttributes.some(item => item.id === id)) return id;
    if (!['attr_subscription_start_dt', 'attr_subscription_start_date'].includes(id)) return id;
    const replacementName = id === 'attr_subscription_start_dt' ? 'subscription_start_date' :
      'subscription_start_dt';
    const candidate = customAttributes.find(item => item.lookmlName === replacementName &&
      isFullDateDimension(item.id));
    if (!candidate) return id;
    const expression = String(candidate.caseExpr || '').replace(/\s+/g, '').toLowerCase();
    const sameDailySource = (!candidate.datePart && candidate.source ===
        'subscription_records.subscription_start_ts') || expression ===
      'date([subscription_records.subscription_start_ts])' || expression ===
      '[subscription_records.subscription_start_ts]';
    return sameDailySource ? candidate.id : id;
  }

  function normalizeDateFilters(config) {
    if (!Array.isArray(config.dateFilters)) {
      config.dateFilters = (config.dateFilterDimensions || []).map((dimension, index) => ({
        id: 'date_' + index,
        role: 'cohort',
        dimension,
        enabled: true,
        range: {
          ...(config.dateRange || {
            period: 'ytd'
          })
        }
      }));
    }
    if (config.dateFilterUiVersion !== 2) {
      // Retire the redundant activity window instead of leaving an invisible filter.
      const migrate = filters => filters.filter(filter => filter.role !== 'event' && filter
          .dimension)
        .map(filter => ({
          ...filter,
          enabled: true,
          range: {
            ...(filter.range || {
              period: 'ytd'
            })
          }
        }));
      config.dateFilters = migrate(config.dateFilters);
      config.dateFiltersDraft = migrate(Array.isArray(config.dateFiltersDraft) ?
        config.dateFiltersDraft : config.dateFilters);
      config.dateRange = {
        period: 'all_time'
      };
      config.dateRangeDraft = {
        period: 'all_time'
      };
      config.dateFilterUiVersion = 2;
    }
    if (!Array.isArray(config.dateFiltersDraft)) config.dateFiltersDraft = JSON.parse(JSON
      .stringify(config.dateFilters));
    for (const filters of [config.dateFilters, config.dateFiltersDraft])
      for (const filter of filters) filter.dimension = resolveReportDateReference(filter
        .dimension);
    if (Array.isArray(config.dateFilterDimensions)) config.dateFilterDimensions = config
      .dateFilterDimensions.map(resolveReportDateReference);
    return config.dateFilters;
  }

  function moduleReportRange(config) {
    const filters = normalizeDateFilters(config);
    const dateAxis = axisPlan(config).categoryDims.find(isFullDateDimension);
    const axisFilter = filters.find(filter => filter.enabled && filter.dimension === dateAxis) ||
      ((!dateAxis && config.compare && config.compare !== 'none') ? filters.find(filter => filter
        .enabled) : null);
    const range = getReportRange(axisFilter?.range || {
      period: 'all_time'
    });
    const focus = config.dateDrillFocus;
    if (focus && focus.dimension === dateAxis) {
      const start = parseDateInput(focus.start),
        end = parseDateInput(focus.end);
      if (start > range.start) range.start = start;
      if (end < range.end) range.end = end;
      range.days = Math.max(0, Math.floor((range.end - range.start) / 86400000) + 1);
      range.label = `${localDateKey(range.start)} to ${localDateKey(range.end)}`;
    }
    return range;
  }

  function renderIndependentDateFilters(widget) {
    const config = widget.config;
    normalizeDateFilters(config);
    const options = [
      ['all_time', 'All time'],
      ['yesterday', 'Yesterday'],
      ['this_week', 'This week'],
      ['last_week', 'Last week'],
      ['this_month', 'This month'],
      ['last_month', 'Last month'],
      ['last_7', 'Last 7 days'],
      ['last_30', 'Last 30 days'],
      ['last_90', 'Last 90 days'],
      ['ytd', 'Year to date'],
      ['custom', 'Custom range']
    ];
    return `<div class="independent-date-filters" data-independent-date-filters>${config.dateFiltersDraft.map((filter,index)=>`<div class="module-date-range-row" data-date-filter-row><span class="date-filter-name">${htmlEscape(dimensionLabel(filter.dimension))}</span><select data-date-filter-index="${index}" data-date-filter-property="period" aria-label="Date window for ${htmlEscape(dimensionLabel(filter.dimension))}">${options.map(([value,label])=>`<option value="${value}"${filter.range.period===value?' selected':''}>${label}</option>`).join('')}</select><div class="date-filter-custom"${filter.range.period==='custom'?'':' hidden'}><label>Start<input type="date" data-date-filter-index="${index}" data-date-filter-property="start" value="${htmlEscape(filter.range.start||'')}"></label><label>End<input type="date" data-date-filter-index="${index}" data-date-filter-property="end" value="${htmlEscape(filter.range.end||'')}"></label></div><button type="button" class="date-filter-remove" data-widget-action="remove-date-filter" data-date-filter-id="${htmlEscape(filter.dimension)}" aria-label="Remove ${htmlEscape(dimensionLabel(filter.dimension))} date filter">×</button></div>`).join('')}<div class="date-window-actions"><span>Date window</span><button type="button" class="primary" data-widget-action="apply-independent-dates">Apply Date Filter</button></div></div>`;
  }

  function stageIndependentDateFilter(event) {
    const control = event.target.closest('[data-date-filter-property]');
    if (!control) return;
    const widget = activeSheet().widgets.find(item => item.id === control.closest(
      '.report-widget')?.dataset.widgetId);
    if (!widget) return;
    normalizeDateFilters(widget.config);
    const filter = widget.config.dateFiltersDraft[Number(control.dataset.dateFilterIndex)],
      property = control.dataset.dateFilterProperty;
    if (property === 'enabled') filter.enabled = control.checked;
    else filter.range[property] = control.value;
    const custom = control.closest('[data-date-filter-row]')?.querySelector(
      '.date-filter-custom');
    if (custom) custom.hidden = filter.range.period !== 'custom';
    persistReporting();
  }

  function applyIndependentDateFilters(widget) {
    normalizeDateFilters(widget.config);
    try {
      for (const filter of widget.config.dateFiltersDraft)
        if (filter.enabled) getReportRange(filter.range)
    } catch (error) {
      toast(error.message);
      return
    }
    widget.config.dateFiltersDraft.forEach(filter => filter.enabled = true);
    widget.config.dateFilters = JSON.parse(JSON.stringify(widget.config.dateFiltersDraft));
    const event = widget.config.dateFilters.find(filter => filter.role === 'event');
    widget.config.dateRange = event?.enabled ? {
      ...event.range
    } : {
      period: 'all_time'
    };
    widget.config.dateFilterDimensions = widget.config.dateFilters.filter(filter => filter
      .role !== 'event' && filter.enabled).map(filter => filter.dimension);
    markWidgetStale(widget);
    persistReporting();
    renderSheet();
  }

  function renderModuleFilterDetails(widget) {
    const config = widget.config,
      filters = config.filterDraft || [],
      pills = filters.length ? filters.map((filter, index) => filter.dimension ?
        `<div class="module-filter-pill" data-module-filter-index="${index}"><b>${htmlEscape(dimensionLabel(filter.dimension))}</b>${filterPickerHtml(`module:${encodeURIComponent(widget.id)}:${index}`,filter.dimension,filter)}<button type="button" data-widget-action="remove-module-filter" data-module-filter-index="${index}" aria-label="Remove ${htmlEscape(dimensionLabel(filter.dimension))} filter">×</button></div>` :
        `<div class="module-filter-pill" data-module-filter-index="${index}"><span class="filter-drop-placeholder">Drop a dimension here</span><button type="button" data-widget-action="remove-module-filter" data-module-filter-index="${index}" aria-label="Remove empty filter">×</button></div>`
      ).join('') :
      '<span class="filter-drop-placeholder">Drag dimensions here to add filters</span>';
    return `<details class="module-config-section module-config-accordion" data-module-collapse="filters" data-widget-id="${htmlEscape(widget.id)}"${config.filtersExpanded===true?' open':''}><summary>Dimension Filters</summary><div class="module-filter-pillbox" data-module-filterdrop data-widget-id="${htmlEscape(widget.id)}">${pills}</div><div class="filter-action-row module-filter-actions"><button type="button" class="primary" data-widget-action="apply-module-filters" data-module-filter-action="apply"${moduleFiltersChanged(widget)?'':' disabled'}>Apply</button><button type="button" class="secondary" data-widget-action="clear-module-filters" data-module-filter-action="clear"${filters.length||config.filters.length?'':' disabled'}>Clear All</button></div><details class="module-config-section module-date-filter" open><summary>Date Filters</summary><div class="module-date-filter-fields" data-module-datefilterdrop data-widget-id="${htmlEscape(widget.id)}"><span class="filter-drop-placeholder">Drag date dimensions here to add date filters</span>${renderIndependentDateFilters(widget)}</div></details></details>`
  }

  function renderCalculationInspector(widget) {
    const value = widget.lastCalculationInspection;
    if (!value) return '<p>Refresh this module to inspect its calculation.</p>';
    return `<p>${value.cached ? 'Cached aggregates reused; scan counters describe their originating calculation.' : 'Fresh calculation.'} Exclusions are sequential, following the order below.</p><dl class="inspection-grid"><dt>Records scanned</dt><dd>${value.scanned.toLocaleString()}</dd><dt>Matching source facts</dt><dd>${value.eligible.toLocaleString()}</dd><dt>Event-date exclusions</dt><dd>${value.eventDateExcluded.toLocaleString()}</dd>${value.filters.map(filter=>`<dt>${htmlEscape(filter.name)} exclusions</dt><dd>${filter.excluded.toLocaleString()}</dd>`).join('')}<dt>Accepted facts</dt><dd>${value.accepted.toLocaleString()}</dd><dt>Groups created</dt><dd>${value.groups.toLocaleString()}</dd><dt>Calculation location</dt><dd>${value.worker?'Background worker':'Page / fallback'}</dd><dt>Generate / transfer</dt><dd>${value.generateMs.toFixed(1)} ms</dd><dt>Filter / formula / aggregation</dt><dd>${value.aggregateMs.toFixed(1)} ms</dd><dt>Render</dt><dd>${(value.renderMs||0).toFixed(1)} ms</dd></dl><p>Times can overlap between modules sharing a batch. Accepted facts count source rows, not joined or displayed rows.</p>`;
  }

  const REPORT_GRID = {
    version: 4,
    columns: 12,
    baseRows: 40,
    cellWidth: (1280 - 15 * 6) / 16,
    rowHeight: 14,
    gap: 6,
    maxRows: 80
  };
  let draggedReportModuleId = null;

  function reportModuleLimits(widget) {
    return {
      minColumns: widget.kind === 'placeholder' ? 1 : 4,
      maxColumns: REPORT_GRID.columns,
      minRows: widget.kind === 'placeholder' ? 2 : 16,
      maxRows: 80
    };
  }

  function normalizeGridWidget(widget) {
    if (widget.gridVersion !== REPORT_GRID.version) {
      let width = Number(widget.colSpan) || 6;
      if (!widget.gridVersion || widget.gridVersion < 2) {
        width = Math.max(4, Math.min(12, width)) * 2;
        widget.rowSpan = Math.max(6, Math.min(24, Number(widget.rowSpan) || 9)) * 2;
        delete widget.gridColumn;
        delete widget.gridRow;
      }
      const previousColumns = widget.gridVersion === 3 ? 16 : 24;
      widget.colSpan = Math.round(width * REPORT_GRID.columns / previousColumns);
      if (widget.gridColumn) widget.gridColumn = Math.floor((widget.gridColumn - 1) * REPORT_GRID
          .columns / previousColumns) +
        1;
      widget.gridVersion = REPORT_GRID.version;
    }
    const limits = reportModuleLimits(widget);
    widget.colSpan = Math.max(limits.minColumns, Math.min(limits.maxColumns, Math.round(Number(
      widget.colSpan) || 8)));
    widget.rowSpan = Math.max(limits.minRows, Math.min(limits.maxRows, Math.round(Number(widget
      .rowSpan) || 18)));
  }

  function gridRectanglesOverlap(a, b) {
    return a.gridColumn < b.gridColumn + b.colSpan && b.gridColumn < a.gridColumn + a.colSpan &&
      a.gridRow < b.gridRow + b.rowSpan && b.gridRow < a.gridRow + a.rowSpan;
  }

  function canPlaceReportWidget(candidate, widgets) {
    return candidate.gridColumn >= 1 && candidate.gridColumn + candidate.colSpan <= REPORT_GRID
      .columns + 1 && candidate.gridRow >= 1 &&
      !widgets.some(other => other.id !== candidate.id && gridRectanglesOverlap(candidate,
        other));
  }

  function normalizeReportGrid(sheet) {
    const signature = () => JSON.stringify([sheet.canvasRows, sheet.widgets.map(widget => [widget
      .id, widget.gridVersion, widget.colSpan, widget.rowSpan, widget.gridColumn, widget
      .gridRow
    ])]);
    const before = signature(),
      placed = [];
    for (const widget of sheet.widgets) {
      normalizeGridWidget(widget);
      widget.gridColumn = Math.round(Number(widget.gridColumn) || 0);
      widget.gridRow = Math.round(Number(widget.gridRow) || 0);
      if (!canPlaceReportWidget(widget, placed)) {
        let found = false;
        for (let row = 1; !found; row++)
          for (let column = 1; column <= REPORT_GRID.columns - widget.colSpan + 1; column++) {
            const candidate = {
              ...widget,
              gridColumn: column,
              gridRow: row
            };
            if (canPlaceReportWidget(candidate, placed)) {
              widget.gridColumn = column;
              widget.gridRow = row;
              found = true;
              break;
            }
          }
      }
      placed.push(widget);
    }
    const bottom = Math.max(0, ...placed.map(widget => widget.gridRow + widget.rowSpan - 1));
    delete sheet.resolution;
    delete sheet.orientation;
    delete sheet.canvasView;
    sheet.canvasRows = Math.max(REPORT_GRID.baseRows, Number(sheet.canvasRows) || 0, bottom + 8);
    sheet.gridLayoutVersion = REPORT_GRID.version;
    return before !== signature();
  }

  function reportGridStyle(widget) {
    return `grid-column:${widget.gridColumn}/span ${widget.colSpan};grid-row:${widget.gridRow}/span ${widget.rowSpan};--report-col-start:${widget.gridColumn};--report-row-start:${widget.gridRow};--report-col-span:${widget.colSpan};--report-row-span:${widget.rowSpan};`;
  }

  function updateReportCanvasGuides(sheet = activeSheet()) {
    const host = $('reportCharts'),
      ruler = $('reportColumnRuler'),
      inner = $('reportCanvasInner');
    if (!host || !inner) return;
    inner.style.setProperty('--report-canvas-rows', String(sheet.canvasRows || REPORT_GRID
      .baseRows));
    if (ruler) ruler.innerHTML = Array.from({
      length: REPORT_GRID.columns
    }, (_, index) => `<span>${index+1}</span>`).join('');
    let rowRuler = host.querySelector('.canvas-row-ruler');
    if (!rowRuler) {
      rowRuler = document.createElement('div');
      rowRuler.className = 'canvas-row-ruler';
      rowRuler.setAttribute('aria-hidden', 'true');
      host.append(rowRuler);
    }
    rowRuler.innerHTML = Array.from({
        length: sheet.canvasRows
      }, (_, index) => index === 0 || (index + 1) % 5 === 0 ?
      `<span style="top:${index*20}px">${index+1}</span>` : '').join('');
    if ($('reportGridInfo')) $('reportGridInfo').textContent =
      `12 columns × ${sheet.canvasRows} rows · Canvas grows downward · Reports: 4–12 columns / 16–80 rows · Placeholders: 1–12 columns / 2–80 rows`;
    host.querySelectorAll('[data-widget-resize]').forEach(handle => {
      const widget = sheet.widgets.find(item => item.id === handle.dataset.widgetResize);
      if (!widget) return;
      const limits = reportModuleLimits(widget);
      handle.title =
        `${widget.colSpan} × ${widget.rowSpan} cells. Resize: ${limits.minColumns}–12 columns, ${limits.minRows}–80 rows.`;
    });
  }

  function clearGridPlacementPreview() {
    $('reportCharts')?.querySelector('.canvas-drop-preview')?.remove();
  }

  function showGridPlacementPreview(candidate, valid) {
    const host = $('reportCharts');
    if (!host) return;
    let preview = host.querySelector('.canvas-drop-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'canvas-drop-preview';
      preview.setAttribute('aria-hidden', 'true');
      host.append(preview);
    }
    const pitch = (host.clientWidth + REPORT_GRID.gap) / REPORT_GRID.columns;
    preview.classList.toggle('invalid', !valid);
    Object.assign(preview.style, {
      left: `${(candidate.gridColumn-1)*pitch}px`,
      top: `${(candidate.gridRow-1)*20}px`,
      width: `${candidate.colSpan*pitch-6}px`,
      height: `${candidate.rowSpan*20-6}px`
    });
    preview.textContent = `${candidate.colSpan} × ${candidate.rowSpan}`;
  }

  function scrollReportCanvasAtEdge(event) {
    const frame = $('reportCanvasScroll');
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const dx = event.clientX > rect.right - 24 ? 20 : event.clientX < rect.left + 24 ? -20 : 0;
    const dy = event.clientY > rect.bottom - 24 ? 20 : event.clientY < rect.top + 24 ? -20 : 0;
    if (dy > 0 && (draggedReportModuleId || moduleResizeState) && frame.scrollTop + frame
      .clientHeight >= frame.scrollHeight - 40) {
      activeSheet().canvasRows += 20;
      updateReportCanvasGuides();
    }
    if (dx || dy) frame.scrollBy(dx, dy);
  }

  function reportGridDropCandidate(event, widget) {
    const host = $('reportCharts'),
      rect = host.getBoundingClientRect(),
      zoom = Number($('reportCanvasInner').style.zoom) || 1,
      pitch = (rect.width + 6 * zoom) / REPORT_GRID.columns;
    return {
      ...widget,
      gridColumn: Math.max(1, Math.min(REPORT_GRID.columns + 1 - widget.colSpan, Math.floor((event
        .clientX - rect
        .left) / pitch) + 1)),
      gridRow: Math.max(1, Math.floor((event.clientY - rect.top) / (20 * zoom)) + 1)
    };
  }

  function previewReportGridDrop(event) {
    if (!draggedReportModuleId) return false;
    const widget = activeSheet().widgets.find(item => item.id === draggedReportModuleId);
    if (!widget) return false;
    event.preventDefault();
    scrollReportCanvasAtEdge(event);
    const candidate = reportGridDropCandidate(event, widget);
    showGridPlacementPreview(candidate, canPlaceReportWidget(candidate, activeSheet().widgets));
    return true;
  }

  function placeholderCard(widget) {
    normalizeGridWidget(widget);
    widget.needsRefresh = false;
    const id = htmlEscape(widget.id);
    const style =
      reportGridStyle(widget);
    return `<article class="report-widget placeholder-widget" data-widget-id="${id}" data-locked="${!!widget.locked}" style="${style}" aria-label="Transparent placeholder"><div class="placeholder-actions"><input type="checkbox" data-module-select="${id}" aria-label="Lock placeholder movement and resizing" title="Lock placeholder movement and resizing"${widget.locked?' checked':''}><button class="module-drag-handle" type="button" draggable="true" data-widget-reorder="${id}" aria-label="Drag to reorder placeholder" title="Drag to reorder">⠿</button><span>Placeholder</span><button type="button" data-widget-action="duplicate" title="Duplicate placeholder">Duplicate</button><button type="button" data-widget-action="remove" aria-label="Remove placeholder" title="Remove placeholder">×</button></div><button class="module-resize-handle" type="button" data-widget-resize="${id}" aria-label="Resize placeholder" title="Drag to resize placeholder">◢</button></article>`;
  }

  function addPlaceholder() {
    const sheet = activeSheet();
    sheet.widgets.push({
      id: 'module_' + (++sheetCounter),
      kind: 'placeholder',
      name: 'Placeholder',
      gridVersion: REPORT_GRID.version,
      colSpan: 8,
      rowSpan: 18,
      needsRefresh: false,
      config: {
        xFields: [],
        yFields: [],
        chartType: 'placeholder'
      }
    });
    persistReporting();
    renderSheet();
    $('reportStatus').textContent =
      'Transparent placeholder added. Drag or resize it to reserve space in the sheet.';
  }

  function moduleCard(widget, index) {
    if (widget.kind === 'placeholder') return placeholderCard(widget);
    const config = widget.config || (widget.config = {
      xFields: [],
      yFields: [],
      compare: 'none',
      chartType: 'bar'
    });
    delete config.configurationHidden;
    delete config.headerButtonsHidden;
    if (!config.compare) config.compare = 'none';
    config.xFields = constrainAxisFields(config.xFields || []);
    if (config.dateDrillUiVersion !== 2) {
      config.dateDrillLevel = 'day';
      config.dateDrillFocus = null;
      config.dateDrillHistory = [];
      delete config.dateDrillDirection;
      config.dateDrillUiVersion = 2;
    }
    config.yFields = constrainAxisFields(config.yFields || []);
    config.filters = Array.isArray(config.filters) ? config.filters : [];
    config.filterDraft = Array.isArray(config.filterDraft) ? config.filterDraft : JSON.parse(JSON
      .stringify(config.filters));
    config.dateRange = config.dateRange && typeof config.dateRange === 'object' ? config
      .dateRange : {
        period: 'ytd'
      };
    config.dateRangeDraft = config.dateRangeDraft && typeof config.dateRangeDraft === 'object' ?
      config.dateRangeDraft : JSON.parse(JSON.stringify(config.dateRange));
    const defaultSubscriptionDate = customAttributes.find(item => item.id ===
      resolveReportDateReference('attr_subscription_start_dt')) || customAttributes.find(item =>
      item.lookmlName === 'subscription_start_dt');
    if (!Array.isArray(config.dateFilterDimensions)) config.dateFilterDimensions = [
      defaultSubscriptionDate?.id
    ].filter(Boolean);
    normalizeDateFilters(config);
    const isAvailable = field => field.kind === 'dimension' ? customAttributes.some(item => item
      .id === field.id) : field.kind === 'metric' && customMetrics.some(item => item.id ===
      field.id);
    config.xFields = config.xFields.filter(isAvailable);
    config.yFields = config.yFields.filter(isAvailable);
    const hasMeasure = [...config.xFields, ...config.yFields].some(field => field.kind ===
      'metric');
    if (!hasMeasure && widget.lastStatus !==
      'Add a Data Dictionary measure to an axis before refreshing.') widget.lastStatus =
      'Add a Data Dictionary measure to an axis before refreshing.';
    normalizeGridWidget(widget);
    if (config.chartType === 'cohort_heatmap') config.chartType = 'heatmap';
    const chartLabels = {
      bar: 'Bar',
      line: 'Line',
      area: 'Area',
      stacked_area: 'Stacked Area',
      pie: 'Pie Chart',
      donut: 'Donut Chart',
      scatter: 'Dot / cluster',
      box: 'Box plot',
      waterfall: 'Waterfall',
      funnel: 'Funnel',
      heatmap: 'Heatmap',
      histogram: 'Histogram',
      treemap: 'Treemap',
      combo: 'Bar+Line',
      bullet: 'Bullet',
      calendar_heatmap: 'Calendar Heatmap',
      spreadsheet: 'Spreadsheet',
      metric_card: 'Metric Card'
    };
    const chartOptions = Object.entries(chartLabels).map(([value, label]) =>
        `<option value="${value}"${config.chartType===value?' selected':''}>${label}</option>`)
      .join('');
    const thresholdEligible = ['metric_card', 'spreadsheet', 'bullet'].includes(config.chartType),
      legendEligible = !['metric_card', 'spreadsheet', 'bullet'].includes(config.chartType),
      paletteEligible = !['metric_card', 'spreadsheet'].includes(config.chartType),
      layoutEligible = ['bar', 'line', 'area', 'stacked_area', 'scatter', 'box'].includes(config
        .chartType),
      tickIntervalEligible = !['metric_card', 'spreadsheet', 'pie', 'donut', 'funnel', 'heatmap',
        'treemap', 'calendar_heatmap', 'bullet'
      ].includes(config.chartType),
      axisMetrics = [...new Set([...config.xFields, ...config.yFields].filter(field => field
        .kind === 'metric').map(field => field.id))],
      xMetricCount = config.xFields.filter(field => field.kind === 'metric').length,
      yMetricCount = config.yFields.filter(field => field.kind === 'metric').length,
      multipleMeasuresOnAxis = xMetricCount > 1 || yMetricCount > 1;
    if (!['stacked', 'separate'].includes(config.layout)) config.layout = 'stacked';
    if (config.showLegend == null) config.showLegend = true;
    const legacyDateDirection = config.dateSort === 'ascending' ? 'ascending' : 'descending';
    for (const field of [...config.xFields, ...config.yFields]) {
      const item = field.kind === 'dimension' ? customAttributes.find(dim => dim.id === field
          .id) : null,
        parts = (item?.source || '').split('.'),
        isDate = item?.type === 'date' || (parts.length === 2 && fieldType(...parts) === 'date');
      if (field.kind === 'dimension') {
        if (!['ascending', 'descending'].includes(field.sortDirection)) field.sortDirection =
          isDate ? legacyDateDirection : 'ascending'
      } else if (!['ascending', 'descending'].includes(field.sortDirection)) field.sortDirection =
        ''
    }
    const sortedMeasure = [...config.xFields, ...config.yFields].find(field => field.kind ===
      'metric' && field.sortDirection);
    if (sortedMeasure)
      for (const field of [...config.xFields, ...config.yFields])
        if (field.kind === 'metric' && field !== sortedMeasure) field.sortDirection = '';
    delete config.dateSort;
    if (!customMetrics.some(item => item.id === config.thresholdMetric)) config.thresholdMetric =
      axisMetrics[0] || customMetrics[0]?.id || '';
    if (config.thresholdEnabled == null) config.thresholdEnabled = false;
    if (!REPORT_PASTEL_PALETTES.some(palette => palette.id === config.paletteId)) config
      .paletteId = 'linen';
    delete config.paletteStart;
    if (config.smartAxisZoomVersion !== 1) {
      config.autoFitValueAxis = true;
      config.dateDrillFocus = null;
      config.dateDrillHistory = [];
      config.smartAxisZoomVersion = 1;
    }
    if (!['none', 'dot', 'circle', 'donut', 'square'].includes(config.lineMarker)) config
      .lineMarker = 'none';
    if (!['straight', 'step', 'smooth'].includes(config.lineShape)) config.lineShape = 'straight';
    if (!/^#[0-9a-f]{6}$/i.test(config.chartTextColor || '')) config.chartTextColor = '#302f2b';
    const reportDisplayControls =
      `${paletteEligible?renderPalettePicker(config.paletteId):''}${['line','combo'].includes(config.chartType)?`<label class="report-control">Line-Point Markers<select data-module-setting="lineMarker">${[['none','None'],['dot','Dots'],['circle','Circles'],['donut','Donuts'],['square','Squares']].map(([value,label])=>`<option value="${value}"${config.lineMarker===value?' selected':''}>${label}</option>`).join('')}</select></label><label class="report-control">Line Shape<select data-module-setting="lineShape">${[['straight','Straight Lines'],['step','Box / Step Lines'],['smooth','Smooth Curved Lines']].map(([value,label])=>`<option value="${value}"${config.lineShape===value?' selected':''}>${label}</option>`).join('')}</select></label>`:''}${['bar','line','area','stacked_area','scatter','box','combo'].includes(config.chartType)?`<label class="report-control axis-auto-fit-control">Smart Axis Zoom<input type="checkbox" data-module-setting="autoFitValueAxis"${config.autoFitValueAxis?' checked':''}></label><label class="report-control">Value Axis Minimum<input type="number" step="any" data-module-setting="valueAxisMinimum" value="${config.valueAxisMinimum==null?'':htmlEscape(config.valueAxisMinimum)}" placeholder="Automatic" aria-label="Value Axis Minimum" title="Display only. Leave blank for automatic bounds; dates and calculations are unchanged."></label>`:''}${['bar','line','scatter','combo'].includes(config.chartType)?`<label class="report-control">Value Axis Scale<select data-module-setting="axisScale"><option value="linear"${config.axisScale!=='log'?' selected':''}>Linear</option><option value="log"${config.axisScale==='log'?' selected':''}>Logarithmic (base 10)</option></select></label>`:''}${multipleMeasuresOnAxis&&legendEligible&&layoutEligible?`<label class="report-control">Measure Layout<select data-module-setting="layout"><option value="stacked"${config.layout==='stacked'?' selected':''}>Stacked measures</option><option value="separate"${config.layout==='separate'?' selected':''}>Individual graphs</option></select></label>`:''}${legendEligible?`<label class="report-control">Legend<select data-module-setting="showLegend"><option value="true"${config.showLegend?' selected':''}>Show</option><option value="false"${!config.showLegend?' selected':''}>Hide</option></select></label>`:''}${tickIntervalEligible?`<label class="report-control">Tick Interval<input type="number" min="0" step="any" data-module-setting="tickInterval" title="Press Enter to apply Tick Interval" aria-keyshortcuts="Enter" value="${config.tickInterval==null?'':htmlEscape(config.tickInterval)}" placeholder="Automatic"></label>`:''}${multipleMeasuresOnAxis&&legendEligible&&config.layout==='separate'?'<small class="report-config-hint">In Individual Graphs mode, place one Dimension after the measures on the same axis to split each graph by its values.</small>':''}`;
    const defaultBands = {
      low: {
        min: 0,
        max: 5,
        background: '#eee8fa',
        text: '#302b38'
      },
      mid: {
        min: 5,
        max: 15,
        background: '#f7dce9',
        text: '#34252e'
      },
      high: {
        min: 15,
        max: '',
        background: '#df82b4',
        text: '#351b2b'
      }
    };
    config.thresholdBands = {
      ...defaultBands,
      ...(config.thresholdBands || {})
    };
    for (const key of ['low', 'mid', 'high']) {
      config.thresholdBands[key] = {
        ...defaultBands[key],
        ...(config.thresholdBands[key] || {})
      };
      for (const colorKey of ['background', 'text'])
        if (!/^#[0-9a-f]{6}$/i.test(config.thresholdBands[key][colorKey])) config.thresholdBands[
          key][colorKey] = defaultBands[key][colorKey]
    }
    const thresholdMetrics = customMetrics,
      thresholdMetricOptions = thresholdMetrics.map(item =>
        `<option value="${htmlEscape(item.id)}"${config.thresholdMetric===item.id?' selected':''}>${htmlEscape(metricMeta(item.id).label)}${item.format==='percent'?' · %':''}</option>`
      ).join(''),
      thresholdBandsHtml = Object.entries({
        low: 'Low',
        mid: 'Middle',
        high: 'High'
      }).map(([key, label]) => {
        const band = config.thresholdBands[key];
        return `<fieldset class="threshold-band-control"><legend>${label}</legend><div class="threshold-band-bounds"><label>Min %<input type="number" step="any" data-threshold-band="${key}" data-threshold-key="min" value="${htmlEscape(band.min)}"${config.thresholdEnabled?'':' disabled'}></label><label>Max %<input type="number" step="any" data-threshold-band="${key}" data-threshold-key="max" value="${htmlEscape(band.max)}" placeholder="No limit"${config.thresholdEnabled?'':' disabled'}></label></div><label class="threshold-color-choice">Background<input type="color" data-threshold-band="${key}" data-threshold-key="background" value="${htmlEscape(band.background)}"${config.thresholdEnabled?'':' disabled'}></label><label class="threshold-color-choice">Text<input type="color" data-threshold-band="${key}" data-threshold-key="text" value="${htmlEscape(band.text)}"${config.thresholdEnabled?'':' disabled'}></label></fieldset>`
      }).join('');
    const thresholdControls = thresholdEligible ?
      `<div class="threshold-controls"><label class="threshold-enable"><input type="checkbox" data-module-setting="thresholdEnabled"${config.thresholdEnabled?' checked':''}> Enable threshold bands</label><label class="report-control threshold-calculation-label">Threshold calculation<select data-module-setting="thresholdMetric"${thresholdMetrics.length?'':' disabled'}>${thresholdMetricOptions||'<option value="">Add a measure in the Data Dictionary</option>'}</select></label><div class="threshold-bands">${thresholdBandsHtml}</div><small>The absolute result of the selected measure is matched directly to these percentage bands. For example, 3% uses Low and 10% uses Middle with the defaults. Use non-overlapping bounds.</small></div>` :
      '';
    const style =
      reportGridStyle(widget);
    return `<article class="card report-widget${widget.needsRefresh?' needs-refresh':''}${config.configurationHidden?' configuration-hidden':''}${config.reportHidden?' report-hidden':''}${config.headerButtonsHidden?' header-buttons-hidden':''}" data-widget-id="${htmlEscape(widget.id)}" data-locked="${!!widget.locked}" style="${style}"><div class="widget-top"><div class="widget-heading"><div class="widget-title-row"><input type="checkbox" data-module-select="${htmlEscape(widget.id)}" aria-label="Lock module movement and resizing" title="Lock module movement and resizing"${widget.locked?' checked':''}><button class="module-drag-handle" type="button" draggable="true" data-widget-reorder="${htmlEscape(widget.id)}" aria-label="Drag to reorder module" title="Drag to reorder">⠿</button><input class="widget-title-input" data-widget-title value="${htmlEscape(widget.name||`Report module ${index+1}`)}" aria-label="Module title" placeholder="Module title"></div><input class="widget-subtitle-input" data-widget-subtitle value="${htmlEscape(widget.subtitle||'') }" aria-label="Module subtitle" placeholder="Add a subtitle"></div><div class="widget-actions"><button type="button" data-widget-action="refresh">Refresh</button><button type="button" data-widget-action="recalculate" title="Recalculate this report without cached results">Recalculate</button><button type="button" data-widget-action="flip">Flip Axis</button><button type="button" data-widget-action="remove">Remove</button><button type="button" data-widget-action="toggle-report" aria-label="${config.reportHidden?'Show':'Hide'} report" title="${config.reportHidden?'Show':'Hide'} report">${config.reportHidden?'Show Report':'Hide Report'}</button><button type="button" data-widget-action="duplicate" aria-label="Duplicate module" title="Duplicate module">Duplicate</button><button type="button" data-widget-action="export-csv" title="Export spreadsheet module as CSV"${config.chartType==='spreadsheet'?'':' disabled'}>CSV</button></div></div>${renderModuleFilterDetails(widget)}<details class="module-config-section module-config-accordion calculation-inspector"><summary>Calculation Inspector</summary><div data-calculation-inspector>${renderCalculationInspector(widget)}</div></details><details class="module-config-section module-config-accordion" data-module-collapse="configuration" data-widget-id="${htmlEscape(widget.id)}"${config.configurationExpanded===true?' open':''}><summary>Configuration</summary><div class="widget-config"><label class="report-control">Chart Type<select data-module-setting="chartType">${chartOptions}</select></label>${config.chartType==='spreadsheet'?`<label class="report-control axis-auto-fit-control">Show Grand Total<input type="checkbox" data-module-setting="showGrandTotal"${config.showGrandTotal!==false?' checked':''}></label><label class="report-control axis-auto-fit-control">Show Subtotals<input type="checkbox" data-module-setting="showSubtotals"${config.showSubtotals?' checked':''}></label>`:''}${reportDisplayControls}${thresholdControls}</div></details><details class="module-config-section module-config-accordion" data-module-collapse="axes" data-widget-id="${htmlEscape(widget.id)}"${config.axesExpanded===false?'':' open'}><summary>X / Y Axes</summary><div class="widget-axis-shelf"><div class="axis-drop" data-drop-axis="x"><b>X Axis · ${config.xFields.length}</b>${moduleFieldPills(config.xFields,'x')||'<small>Drop fields here</small>'}</div><div class="axis-drop" data-drop-axis="y"><b>Y Axis · ${config.yFields.length}</b>${moduleFieldPills(config.yFields,'y')||'<small>Drop fields here</small>'}</div></div><small class="axis-hint">When an axis has measures, it supports one dimension. Put it before a measure to create panels, or after measures to split each measure by that dimension’s values.</small></details>${dateDrillControls(config)}<div class="widget-kpis">${widget.lastKpis||''}</div><div class="widget-content${config.chartType==='metric_card'?' metric-card-content':''}">${widget.lastHtml||'<div class="widget-empty">Add a measure to the Y Axis and optional dimensions, then refresh this module.</div>'}</div><div class="widget-subtitle" hidden>${htmlEscape(widget.lastSubtitle||'Configure axes, then refresh.')}</div><div class="widget-status${widget.needsRefresh?' needs-refresh':''}">${htmlEscape((widget.lastStatus||(widget.needsRefresh?'Needs refresh — click Refresh.':'Ready to configure.')).replace(/ · [\d.]+ s$/, ''))}</div><button class="module-resize-handle" type="button" data-widget-resize="${htmlEscape(widget.id)}" aria-label="Resize module" title="Drag to resize module">◢</button></article>`
  }

  function saveSheetName(event, finalize = false) {
    const editor = event.target.closest('[data-sheet-name-editor]'),
      sheet = reportSheets.find(item => item.id === editor?.dataset.sheetNameEditor);
    if (!editor || !sheet) return;
    const typed = editor.textContent.replace(/[\r\n]+/g, ' ').slice(0, 40);
    if (!finalize && !typed.trim()) return;
    sheet.name = finalize ? (typed.trim() || sheet.name || 'Sheet 1') : typed;
    editor.setAttribute('aria-label', `Rename ${sheet.name}`);
    if (finalize) editor.textContent = sheet.name;
    renderPresentationControls();
    persistReporting()
  }

  function renderPresentationControls() {
    const current = reportSheets.findIndex(sheet => sheet.id === activeSheetId),
      controls = $('presentationControls');
    if (!controls) return;
    const total = reportSheets.length,
      index = Math.max(0, current);
    $('presentationSheetName').textContent = reportSheets[index]?.name || 'Sheet';
    $('presentationSheetCount').textContent = `${index+1} / ${total}`;
    $('presentationPrev').disabled = index <= 0;
    $('presentationNext').disabled = index >= total - 1;
    controls.hidden = !document.body.classList.contains('presentation-mode')
  }

  function navigatePresentationSheet(direction) {
    const index = reportSheets.findIndex(sheet => sheet.id === activeSheetId),
      next = Math.max(0, Math.min(reportSheets.length - 1, index + direction));
    if (next === index) return;
    activeSheetId = reportSheets[next].id;
    cancelWidgetEdit();
    persistReporting();
    renderSheet()
  }

  function setPresentationMode(enabled) {
    document.body.classList.toggle('presentation-mode', !!enabled);
    document.documentElement.classList.toggle('presentation-mode', !!enabled);
    document.querySelectorAll(
      '#reportCharts [data-widget-title],#reportCharts [data-widget-subtitle]').forEach(
      input => {
        input.readOnly = !!enabled
      });
    const button = $('presentationMode');
    if (button) {
      button.setAttribute('aria-pressed', String(!!enabled));
      button.textContent = enabled ? 'Exit Presentation' : 'Presentation'
    }
    renderPresentationControls();
    updateSelectedModuleToolbar();
  }

  function renderSheet() {
    restoreSidebarSetup();
    const sheet = activeSheet(),
      tabs = $('reportSheetTabs');
    const gridChanged = normalizeReportGrid(sheet);
    applyReportSidebarWidth(false);
    if (tabs) tabs.innerHTML = reportSheets.map(item =>
      `<button type="button" class="sheet-tab${item.id===activeSheetId?' active':''}" data-sheet-id="${htmlEscape(item.id)}" aria-label="Select ${htmlEscape(item.name||'Untitled sheet')}"><span class="sheet-tab-name" data-sheet-name-editor="${htmlEscape(item.id)}" contenteditable="true" role="textbox" aria-label="Rename ${htmlEscape(item.name||'Untitled sheet')}" aria-multiline="false" spellcheck="false">${htmlEscape(item.name||'Untitled sheet')}</span></button>`
    ).join('');
    const deleteButton = $('deleteReportSheet');
    if (deleteButton) {
      deleteButton.disabled = reportSheets.length <= 1;
      deleteButton.title = deleteButton.disabled ? 'At least one report sheet must remain' :
        'Delete the active sheet'
    }
    if ($('sheetDescription')) {
      const reports = sheet.widgets.filter(widget => widget.kind !== 'placeholder').length;
      const placeholders = sheet.widgets.length - reports;
      $('sheetDescription').textContent =
        `${reports} report module${reports===1?'':'s'}${placeholders?` · ${placeholders} placeholder${placeholders===1?'':'s'}`:''} · Refresh modules to calculate results.`;
    }
    activeSheet();
    const host = $('reportCharts');
    if (!host) return;
    metricCardFitObserver?.disconnect();
    host.innerHTML = sheet.widgets.length ? sheet.widgets.map(moduleCard).join('') :
      '<div class="card widget-empty canvas-empty">Add report modules or transparent placeholders to this grid.</div>';
    host.querySelectorAll('.report-date-axis,[data-date-reset]').forEach(node => node.remove());
    updateReportCanvasGuides(sheet);
    if (gridChanged) persistReporting();
    host.querySelectorAll('.metric-card').forEach(card => {
      fitMetricCardValue(card);
      metricCardFitObserver?.observe(card);
    });
    host.querySelectorAll('[data-widget-action="refresh"]').forEach(button => button
      .addEventListener('click', event => {
        if (event.__moduleRefreshHandled) return;
        event.preventDefault();
        event.stopPropagation();
        const id = String(button.closest('.report-widget')?.dataset.widgetId || ''),
          target = activeSheet().widgets.find(item => String(item.id) === id);
        if (target) void refreshWidget(target);
        else if ($('reportStatus')) $('reportStatus').textContent =
          'Could not find this report module. Try adding the module again.'
      }));
    if (document.body.classList.contains('presentation-mode')) host.querySelectorAll(
      '[data-widget-title],[data-widget-subtitle]').forEach(input => {
      input.readOnly = true
    });
    renderPresentationControls();
    applyCanvasView();
    selectReportModule(selectedReportSheetId === activeSheetId ? selectedReportModuleId : null);
    $('resetReportCrossFilter').hidden = !sheet.crossFilter;
    captureReportHistory();
  }

  function stageModuleDateRange(event) {
    const control = event.target.closest('[data-module-date-part]');
    if (!control) return;
    const widget = activeSheet().widgets.find(item => String(item.id) === String(control.dataset
      .widgetId));
    if (!widget) return;
    const config = widget.config,
      draft = config.dateRangeDraft || (config.dateRangeDraft = JSON.parse(JSON.stringify(config
        .dateRange || {
          period: 'ytd'
        }))),
      card = control.closest('.report-widget');
    if (control.dataset.moduleDatePart === 'period') draft.period = control.value;
    else draft[control.dataset.moduleDatePart] = control.value;
    const custom = card?.querySelector('.sheet-custom-date-range');
    if (custom) custom.hidden = draft.period !== 'custom';
    const apply = card?.querySelector('[data-widget-action="apply-module-date"]'),
      state = card?.querySelector('.module-date-filter small');
    const changed = JSON.stringify(config.dateRange || {
      period: 'ytd'
    }) !== JSON.stringify(draft);
    if (apply) apply.disabled = !changed;
    if (state) state.textContent = changed ? 'Unapplied changes' : 'Applied';
    persistReporting()
  }

  function applyModuleDateRange(widget) {
    const config = widget.config,
      draft = config.dateRangeDraft || config.dateRange || {
        period: 'ytd'
      };
    if (draft.period === 'custom' && (!draft.start || !draft.end)) {
      const status = widgetElement(widget.id)?.querySelector('.widget-status');
      if (status) status.textContent =
        'Choose both start and end dates before applying the module date filter.';
      return
    }
    config.dateRange = JSON.parse(JSON.stringify(draft));
    markWidgetStale(widget);
    persistReporting();
    renderSheet();
    if ($('reportStatus')) $('reportStatus').textContent =
      `Date filter applied to “${widget.name||'Report module'}”. Refresh that module to update its results.`
  }

  function saveWidget() {
    const sheet = activeSheet(),
      id = 'module_' + (++sheetCounter);
    sheet.widgets.push({
      id,
      gridVersion: REPORT_GRID.version,
      colSpan: 8,
      rowSpan: 18,
      name: `Report module ${sheet.widgets.filter(item=>item.kind!=='placeholder').length+1}`,
      subtitle: '',
      needsRefresh: true,
      config: {
        xFields: [],
        yFields: [],
        compare: 'none',
        alignment: 'calendar',
        grain: 'auto',
        chartType: 'bar',
        layout: 'stacked',
        showLegend: true,
        paletteId: 'linen',
        chartTextColor: '#302f2b',
        thresholdEnabled: false,
        thresholdBands: {
          low: {
            min: 0,
            max: 5,
            background: '#eee8fa',
            text: '#302b38'
          },
          mid: {
            min: 5,
            max: 15,
            background: '#f7dce9',
            text: '#34252e'
          },
          high: {
            min: 15,
            max: '',
            background: '#df82b4',
            text: '#351b2b'
          }
        },
        overlays: []
      }
    });
    persistReporting();
    renderSheet();
    $('reportStatus').textContent =
      ''
  }
  const reportRefreshFlights = new Map();
  async function refreshWidget(widget) {
    if (widget.kind === 'placeholder') return;
    if (reportRefreshFlights.has(widget.id)) return reportRefreshFlights.get(widget.id);
    const task = refreshWidgetInternal(widget);
    reportRefreshFlights.set(widget.id, task);
    try {
      return await task
    } finally {
      reportRefreshFlights.delete(widget.id)
    }
  }
  async function refreshWidgetInternal(widget) {
    const refreshStarted = performance.now();
    const el = widgetElement(widget.id);
    if (!el) return;
    const status = el.querySelector('.widget-status');
    if (!tables || !appState) {
      const message = 'Generate synthetic data before refreshing reports.';
      if (status) status.textContent = message;
      if ($('reportStatus')) $('reportStatus').textContent = message;
      widget.lastStatus = message;
      widget.needsRefresh = true;
      return
    }
    const fields = [...(widget.config?.xFields || []), ...(widget.config?.yFields || [])],
      hasMeasure = fields.some(field => field.kind === 'metric' && customMetrics.some(metric =>
        metric.id === field.id));
    if (!hasMeasure) {
      const message = 'Add a Data Dictionary measure to an axis before refreshing.';
      if (status) status.textContent = message;
      if ($('reportStatus')) $('reportStatus').textContent = message;
      widget.lastStatus = message;
      widget.needsRefresh = true;
      return
    }
    const token = (reportRunTokens.get(widget.id) || 0) + 1;
    reportRunTokens.set(widget.id, token);
    const button = el.querySelector('[data-widget-action="refresh"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Refreshing…'
    }
    if (status) status.textContent = 'Refreshing report…';
    if ($('reportStatus')) $('reportStatus').textContent =
      `Refreshing “${widget.name||'report module'}”…`;
    widget.lastCalculationInspection = null;
    try {
      await buildReport(widget.config, el, token);
      if (!el.isConnected || reportRunTokens.get(widget.id) !== token) return;
      if (status?.textContent?.startsWith('Incompatible report:')) {
        widget.needsRefresh = true;
        widget.lastStatus = status.textContent;
        const inspector = el.querySelector('[data-calculation-inspector]');
        if (inspector) inspector.textContent =
          'Validation stopped calculation before scanning data. ' + status.textContent;
        return
      }
      if (status?.textContent === 'Choose at least one metric for this module.') {
        const message = 'Add a Data Dictionary measure to an axis before refreshing.';
        status.textContent = message;
        widget.lastStatus = message;
        widget.needsRefresh = true;
        if ($('reportStatus')) $('reportStatus').textContent = message;
        return
      }
      if (widget.lastCalculationInspection) {
        widget.lastCalculationInspection.renderMs = performance.now() - (widget
          .lastCalculationInspection.renderStarted || performance.now());
        delete widget.lastCalculationInspection.renderStarted;
        const inspector = el.querySelector('[data-calculation-inspector]');
        if (inspector) inspector.innerHTML = renderCalculationInspector(widget);
      }
      widget.lastRefreshMs = performance.now() - refreshStarted;
      studioPerformance.reports.push({
        id: widget.id,
        name: widget.name,
        elapsedMs: widget.lastRefreshMs,
        cached: el.dataset.aggregateCacheHit === 'true'
      });
      if (studioPerformance.reports.length > 50) studioPerformance.reports.shift();
      // Timing remains available in Calculation Inspector, not the report footer.
      el.querySelectorAll('.report-table thead th').forEach(cell => cell.setAttribute('scope',
        'col'));
      el.querySelectorAll('.widget-content svg').forEach((svg, index) => {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', (widget.name || 'Report') + ' graph ' + (index + 1) +
          '; values available in tooltips. Use Spreadsheet for a tabular view.');
      });
      widget.lastHtml = el.querySelector('.widget-content')?.innerHTML || '';
      widget.lastKpis = el.querySelector('.widget-kpis')?.innerHTML || '';
      widget.lastStatus = status?.textContent || '';
      widget.lastSubtitle = el.querySelector('.widget-subtitle')?.textContent || '';
      widget.lastRunId = appState.runId;
      widget.lastDefinitionRevision = definitionRevision;
      widget.needsRefresh = false;
      el.classList.remove('needs-refresh');
      status?.classList.remove('needs-refresh');
      if ($('reportStatus')) $('reportStatus').textContent = 'Report refreshed.';
      persistReporting();
    } catch (error) {
      console.error('Report module refresh failed:', error);
      if (status) status.textContent = `Refresh failed: ${error?.message||'Unexpected error'}`;
      if ($('reportStatus')) $('reportStatus').textContent =
        `Refresh failed: ${error?.message||'Unexpected error'}`;
      widget.lastStatus = status?.textContent || 'Refresh failed';
      widget.needsRefresh = true;
      toast(`Report refresh failed: ${error?.message||'Unexpected error'}`)
    } finally {
      if (button?.isConnected) {
        button.disabled = false;
        button.textContent = 'Refresh'
      }
    }
  }
  let sheetRefreshFlight = null;
  async function refreshActiveSheet() {
    if (sheetRefreshFlight) return sheetRefreshFlight;
    sheetRefreshFlight = (async () => {
      if (!appState) return;
      const started = performance.now(),
        widgets = activeSheet().widgets.filter(widget => widget.kind !== 'placeholder'),
        runId = appState.runId,
        fields = widgets.flatMap(widget => [...(widget.config?.xFields || []), ...(widget
            .config?.yFields || []), ...(widget.config?.filters || []).map(filter => ({
            kind: 'dimension',
            id: filter.dimension
          })), ...(widget.config?.dateFilterDimensions || []).map(id => ({
            kind: 'dimension',
            id
          })), ...(widget.config?.dateFilters || []).filter(filter => filter.enabled)
          .map(filter => ({
            kind: 'dimension',
            id: filter.dimension
          })), ...(widget.config?.thresholdEnabled && widget.config?.thresholdMetric ?
        [{
            kind: 'metric',
            id: widget.config.thresholdMetric
          }] : [])
        ]),
        needsSchedules = fields.some(field => (field.kind === 'metric' ? metricFieldRefs(
          field.id) : dimensionFieldRefs(field.id)).some(ref => ref.startsWith(
          'scheduled_subscription_payment_records.')));
      const factTables = new Set(widgets.flatMap(widget => [...axisPlan(widget.config)
        .metrics, ...(widget.config?.thresholdEnabled && widget.config
          ?.thresholdMetric ? [widget.config.thresholdMetric] : [])
      ].flatMap(id => metricDependencyIds(id))).map(id => ReportingTools.lineage(
        customMetrics.find(metric => metric.id === id), customMetrics,
        customAttributes).fact).filter(Boolean));
      for (const field of fields)
        for (const reference of field.kind === 'metric' ? metricFieldRefs(field.id) :
            dimensionFieldRefs(field.id)) factTables.add(reference.split('.')[0]);
      sharedReportSession = {
        runId,
        needsSchedules: needsSchedules || factTables.has(
          'scheduled_subscription_payment_records'),
        factTables,
        batches: new Map(),
        completed: new Map(),
        participants: widgets.length
      };
      const button = $('refreshAllReports');
      if (button) button.disabled = true;
      try {
        await Promise.all(widgets.map(widget => refreshWidget(widget)));
        studioPerformance.refreshAll = {
          modules: widgets.length,
          elapsedMs: performance.now() - started
        };
        if ($('reportStatus')) $('reportStatus').textContent =
          `${widgets.length} modules refreshed in ${(studioPerformance.refreshAll.elapsedMs/1000).toFixed(2)} s.`
      } finally {
        sharedReportSession = null;
        if (button) button.disabled = false
      }
    })();
    try {
      return await sheetRefreshFlight
    } finally {
      sheetRefreshFlight = null
    }
  }

  function addSheet() {
    const id = 'sheet_' + (++sheetCounter);
    reportSheets.push({
      id,
      name: `Sheet ${reportSheets.length+1}`,
      widgets: []
    });
    activeSheetId = id;
    persistReporting();
    renderSheet();
    $('reportStatus').textContent = 'Blank sheet created.'
  }

  function duplicateSheet() {
    const source = activeSheet();
    if (!source) return;
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = 'sheet_' + (++sheetCounter);
    copy.name = `${source.name||'Sheet'} Copy`.slice(0, 40);
    copy.widgets = (copy.widgets || []).map(widget => {
      widget.id = 'module_' + (++sheetCounter);
      widget.needsRefresh = true;
      delete widget.lastSpreadsheetCsvRows;
      delete widget.lastHtml;
      delete widget.lastKpis;
      delete widget.lastStatus;
      delete widget.lastSubtitle;
      delete widget.lastRunId;
      delete widget.lastDefinitionRevision;
      return widget
    });
    reportSheets.splice(reportSheets.findIndex(sheet => sheet.id === source.id) + 1, 0, copy);
    activeSheetId = copy.id;
    persistReporting();
    renderSheet();
    $('reportStatus').textContent = 'Sheet duplicated. Refresh its modules to calculate results.'
  }

  function deleteSheet() {
    if (reportSheets.length <= 1) {
      $('reportStatus').textContent = 'Keep at least one report sheet.';
      return
    }
    const index = reportSheets.findIndex(sheet => sheet.id === activeSheetId),
      sheet = reportSheets[index];
    if (!window.confirm(
        `Delete sheet “${sheet?.name||'Untitled sheet'}” and its ${sheet?.widgets?.length||0} report modules?`
      )) return;
    reportSheets.splice(index, 1);
    activeSheetId = reportSheets[Math.min(index, reportSheets.length - 1)]?.id || reportSheets[0]
      .id;
    cancelWidgetEdit();
    persistReporting();
    renderSheet();
    $('reportStatus').textContent = 'Sheet deleted.'
  }

  function handleFieldDragStart(event) {
    if (event.target.closest("[data-widget-reorder]") && activeSheet().widgets.find(w => w.id ===
        event.target.closest("[data-widget-reorder]").dataset.widgetReorder)?.locked) {
      event.preventDefault();
      return;
    }
    const axisField = event.target.closest('[data-axis-field]');
    if (axisField && event.dataTransfer) {
      draggedReportModuleId = null;
      clearGridPlacementPreview();
      const payload = {
        action: 'axis-reorder',
        widgetId: axisField.closest('.report-widget')?.dataset.widgetId,
        axis: axisField.dataset.axis,
        index: Number(axisField.dataset.axisField)
      };
      event.dataTransfer.setData('application/x-report-axis-field', JSON.stringify(payload));
      event.dataTransfer.setData('application/json', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
      return
    }
    const reorder = event.target.closest('[data-widget-reorder]');
    if (reorder && event.dataTransfer) {
      draggedReportModuleId = reorder.dataset.widgetReorder;
      event.dataTransfer.setData('application/x-widget-id', reorder.dataset.widgetReorder);
      event.dataTransfer.effectAllowed = 'move';
      return
    }
    const field = event.target.closest('[data-field-kind][data-field-id]');
    if (!field || !event.dataTransfer) return;
    draggedReportModuleId = null;
    clearGridPlacementPreview();
    event.dataTransfer.setData('application/json', JSON.stringify({
      kind: field.dataset.fieldKind,
      id: field.dataset.fieldId,
      label: fieldLabel(field.dataset.fieldId, field.dataset.fieldKind)
    }));
    event.dataTransfer.effectAllowed = 'copy'
  }

  function clearAxisDropMarkers() {
    document.querySelectorAll(
      '.axis-field-chip.drag-over-before,.axis-field-chip.drag-over-after').forEach(el => el
      .classList.remove('drag-over-before', 'drag-over-after'))
  }

  function handleAxisFieldReorder(event, axis) {
    let payload;
    try {
      payload = JSON.parse(event.dataTransfer?.getData('application/x-report-axis-field') || event
        .dataTransfer?.getData('application/json') || 'null')
    } catch {
      return false
    }
    if (payload?.action !== 'axis-reorder') return false;
    event.preventDefault();
    clearAxisDropMarkers();
    const widget = activeSheet().widgets.find(item => item.id === payload.widgetId),
      config = widget?.config,
      targetWidgetId = axis.closest('.report-widget')?.dataset.widgetId;
    if (!widget || payload.widgetId !== targetWidgetId) return true;
    const sourceAxis = payload.axis,
      targetAxis = axis.dataset.dropAxis,
      sourceFields = sourceAxis === 'x' ? config?.xFields : config?.yFields,
      targetFields = targetAxis === 'x' ? config?.xFields : config?.yFields;
    if (!sourceFields || !targetFields || payload.index < 0 || payload.index >= sourceFields
      .length) return true;
    const targetPill = event.target.closest('[data-axis-field]');
    let insertAt = targetFields.length;
    if (targetPill && targetPill.dataset.axis === targetAxis) {
      const targetIndex = Number(targetPill.dataset.axisField),
        rect = targetPill.getBoundingClientRect(),
        after = event.clientX > rect.left + rect.width / 2;
      insertAt = targetIndex + (after ? 1 : 0)
    }
    if (sourceAxis === targetAxis) {
      if (targetPill && Number(targetPill.dataset.axisField) === payload.index) return true;
      const [field] = sourceFields.splice(payload.index, 1);
      if (payload.index < insertAt) insertAt--;
      targetFields.splice(Math.max(0, Math.min(insertAt, targetFields.length)), 0, field)
    } else {
      const [field] = sourceFields.splice(payload.index, 1);
      if (field.kind === 'dimension' && targetFields.some(item => item.kind === 'metric'))
        for (let i = targetFields.length - 1; i >= 0; i--)
          if (targetFields[i].kind === 'dimension') targetFields.splice(i, 1);
      const existingIndex = targetFields.findIndex(item => item.kind === field.kind && item.id ===
        field.id);
      if (existingIndex >= 0) targetFields.splice(existingIndex, 1);
      if (existingIndex >= 0 && existingIndex < insertAt) insertAt--;
      targetFields.splice(Math.max(0, Math.min(insertAt, targetFields.length)), 0, field)
    }
    config.xFields = constrainAxisFields(config.xFields);
    config.yFields = constrainAxisFields(config.yFields);
    markWidgetStale(widget);
    persistReporting();
    renderSheet();
    return true
  }

  function handleModuleDrop(event) {
    if (activeSheet().layoutLocked && event.dataTransfer?.getData("application/x-widget-id")) {
      event.preventDefault();
      return;
    }
    const sheet = activeSheet(),
      targetCard = event.target.closest('.report-widget'),
      draggedId = event.dataTransfer?.getData('application/x-widget-id');
    if (draggedId) {
      event.preventDefault();
      const widget = sheet.widgets.find(item => item.id === draggedId);
      if (!widget || widget.locked) return;
      const candidate = reportGridDropCandidate(event, widget);
      clearGridPlacementPreview();
      draggedReportModuleId = null;
      if (!canPlaceReportWidget(candidate, sheet.widgets)) {
        toast('Choose unoccupied grid cells for this module.');
        return;
      }
      widget.gridColumn = candidate.gridColumn;
      widget.gridRow = candidate.gridRow;
      normalizeReportGrid(sheet);
      persistReporting();
      renderSheet();
      return;
    }
    const axis = event.target.closest('[data-drop-axis]');
    if (!axis) return;
    event.preventDefault();
    if (handleAxisFieldReorder(event, axis)) return;
    let field;
    try {
      field = JSON.parse(event.dataTransfer.getData('application/json') || '{}')
    } catch {
      return
    }
    const widget = sheet.widgets.find(w => w.id === axis.closest('.report-widget')?.dataset
      .widgetId);
    if (!widget || !['dimension', 'metric'].includes(field.kind)) return;
    const config = widget.config,
      arr = axis.dataset.dropAxis === 'x' ? config.xFields : config.yFields;
    if (![...config.xFields, ...config.yFields].some(x => x.id === field.id && x.kind === field
        .kind)) {
      if (field.kind === 'dimension' && arr.some(item => item.kind === 'metric'))
        for (let i = arr.length - 1; i >= 0; i--)
          if (arr[i].kind === 'dimension') arr.splice(i, 1);
      if (field.kind === 'dimension') {
        const item = customAttributes.find(dim => dim.id === field.id),
          parts = (item?.source || '').split('.');
        field.sortDirection = item?.type === 'date' || (parts.length === 2 && fieldType(...
          parts) === 'date') ? 'descending' : 'ascending'
      } else field.sortDirection = '';
      arr.push(field)
    }
    config.xFields = constrainAxisFields(config.xFields);
    config.yFields = constrainAxisFields(config.yFields);
    markWidgetStale(widget);
    persistReporting();
    renderSheet()
  }

  function saveWidgetTitle(event) {
    const input = event.target.closest('[data-widget-title],[data-widget-subtitle]');
    if (!input) return;
    const widget = activeSheet().widgets.find(w => w.id === input.closest('.report-widget')
      ?.dataset.widgetId);
    if (widget) {
      if (input.hasAttribute('data-widget-title')) widget.name = input.value.trim() ||
        'Report module';
      else widget.subtitle = input.value.trim();
      persistReporting()
    }
  }

  function handleModuleSettingsChange(event) {
    const widget = activeSheet().widgets.find(w => w.id === event.target.closest('.report-widget')
      ?.dataset.widgetId);
    if (!widget) return;
    const bandKey = event.target.dataset.thresholdBand,
      bandField = event.target.dataset.thresholdKey;
    if (bandKey && bandField) {
      const bands = widget.config.thresholdBands || (widget.config.thresholdBands = {}),
        band = bands[bandKey] || (bands[bandKey] = {});
      band[bandField] = bandField === 'background' || bandField === 'text' ? event.target.value :
        event.target.value === '' ? '' : Number(event.target.value);
      markWidgetStale(widget);
      persistReporting();
      return
    }
    const sort = event.target.dataset.axisSort;
    if (sort) {
      const [axis, indexText] = sort.split(':'), fields = widget.config[axis === 'x' ? 'xFields' :
        'yFields'], field = fields?.[Number(indexText)];
      if (!field) return;
      field.sortDirection = event.target.value || '';
      if (field.kind === 'metric' && field.sortDirection)
        for (const other of [...widget.config.xFields, ...widget.config.yFields])
          if (other.kind === 'metric' && other !== field) other.sortDirection = '';
      persistReporting();
      void redrawDisplayedReport(widget);
      return
    }
    const setting = event.target.dataset.moduleSetting;
    if (setting) {
      if (setting === 'tickInterval' && !event.target.checkValidity()) return;
      widget.config[setting] = setting === 'showLegend' ? event.target.value === 'true' : event
        .target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' &&
        event.target.value !== '' ? Number(event.target.value) : event.target.value;
      if (['showGrandTotal', 'showSubtotals'].includes(setting)) {
        persistReporting();
        void redrawDisplayedReport(widget);
        return;
      }
      if (setting === 'paletteId') {
        const control = event.target.closest('.palette-control');
        const preset = REPORT_PASTEL_PALETTES.find(p => p.id === widget.config.paletteId);
        if (control && preset) {
          control.querySelector('.palette-choice-current').innerHTML = reportPaletteSwatches(
            preset.id) + `<span>${htmlEscape(preset.name)}</span>`;
          control.querySelector('.palette-picker').open = false;
          control.querySelectorAll('[data-palette-choice]').forEach(button => button.setAttribute(
            'aria-pressed', String(button.dataset.paletteChoice === preset.id)));
        }
        persistReporting();
        void redrawDisplayedReport(widget, {
          paletteId: widget.config.paletteId
        });
        return;
      }
      if (['axisScale', 'autoFitValueAxis', 'valueAxisMinimum', 'lineMarker', 'lineShape',
          'tickInterval'
        ]
        .includes(setting)) {
        persistReporting();
        void redrawDisplayedReport(widget, {
          axisScale: widget.config.axisScale,
          autoFitValueAxis: widget.config.autoFitValueAxis,
          valueAxisMinimum: widget.config.valueAxisMinimum,
          lineMarker: widget.config.lineMarker,
          lineShape: widget.config.lineShape,
          tickInterval: widget.config.tickInterval
        });
        return;
      }
      if (setting === 'thresholdEnabled') {
        event.target.closest('.threshold-controls')?.querySelectorAll(
          '[data-threshold-band],[data-module-setting="thresholdMetric"]').forEach(input =>
          input.disabled = !event.target.checked)
      }
      if (setting === 'showLegend') {
        const content = widgetElement(widget.id)?.querySelector('.widget-content');
        content?.querySelectorAll('.chart-legend').forEach(legend => legend.hidden = !widget
          .config.showLegend || legend.dataset.legendAllowed !== 'true');
        if (content) widget.lastHtml = content.innerHTML;
        persistReporting();
        return
      }
      markWidgetStale(widget);
      persistReporting();
      if (setting === 'chartType') renderSheet()
    }
  }

  function handleRefreshClick(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement,
      button = target?.closest('[data-widget-action="refresh"]');
    if (!button) return;
    event.__moduleRefreshHandled = true;
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = String(button.closest('.report-widget')?.dataset.widgetId || ''),
      widget = activeSheet().widgets.find(item => String(item.id) === id);
    if (widget) void refreshWidget(widget);
    else if ($('reportStatus')) $('reportStatus').textContent =
      'Could not find this report module. Try adding the module again.'
  }

  function handleWidgetAction(event) {
    if (handleFilterPickerAction(event)) return;
    const button = event.target.closest('[data-widget-action],[data-remove-axis]');
    if (!button) return;
    const el = button.closest('.report-widget'),
      sheet = activeSheet(),
      widget = sheet.widgets.find(w => String(w.id) === String(el?.dataset.widgetId));
    if (!widget) return;
    const action = button.dataset.widgetAction;
    if (action === 'refresh') return;
    if (action === 'recalculate') {
      const captured = reportDisplaySnapshots.get(widget.id);
      reportAggregateCache.delete(aggregateCacheKey(captured?.config || widget.config));
      void refreshWidget(widget);
      return
    }
    if (action === 'apply-module-filters') {
      applyModuleFilters(widget);
      return
    }
    if (action === 'clear-module-filters') {
      clearModuleFilters(widget);
      return
    }
    if (action === 'remove-module-filter') {
      removeModuleFilter(widget, Number(button.dataset.moduleFilterIndex));
      return
    }
    if (action === 'remove-date-filter') {
      removeModuleDateFilter(widget, button.dataset.dateFilterId);
      return
    }
    if (action === 'apply-independent-dates') {
      applyIndependentDateFilters(widget);
      return
    }
    if (action === 'apply-module-date') {
      applyModuleDateRange(widget);
      return
    }
    if (action === 'export-csv') {
      void exportWidgetCsv(widget);
      return
    }
    if (action === 'remove') {
      sheet.widgets = sheet.widgets.filter(w => String(w.id) !== String(widget.id));
      persistReporting();
      renderSheet();
      return
    }
    if (action === 'toggle-report') {
      widget.config.reportHidden = !widget.config.reportHidden;
      persistReporting();
      renderSheet();
      return
    }
    if (action === 'duplicate') {
      const copy = JSON.parse(JSON.stringify(widget));
      copy.id = 'module_' + (++sheetCounter);
      copy.name = `${widget.name||'Report module'} copy`;
      copy.needsRefresh = true;
      delete copy.lastSpreadsheetCsvRows;
      delete copy.lastHtml;
      delete copy.lastKpis;
      delete copy.lastStatus;
      delete copy.lastSubtitle;
      delete copy.lastRunId;
      delete copy.lastDefinitionRevision;
      const index = sheet.widgets.findIndex(item => item.id === widget.id);
      sheet.widgets.splice(index + 1, 0, copy);
      persistReporting();
      renderSheet();
      $('reportStatus').textContent =
        `Duplicated “${widget.name||'Report module'}”. Refresh the copy to calculate its results.`;
      return
    }
    if (action === 'flip') {
      [widget.config.xFields, widget.config.yFields] = [widget.config.yFields, widget.config
        .xFields
      ];
      widget.config.flipAxis = !widget.config.flipAxis;
      markWidgetStale(widget);
      persistReporting();
      renderSheet();
      return
    }
    if (button.dataset.removeAxis) {
      const [axis, index] = button.dataset.removeAxis.split(':');
      widget.config[axis === 'x' ? 'xFields' : 'yFields'].splice(Number(index), 1)
    }
    markWidgetStale(widget);
    persistReporting();
    renderSheet()
  }

  // Move from the module surface without turning ordinary chart clicks into drags.
  let surfaceDrag = null;
  let suppressSurfaceClick = false;

  function startSurfaceDrag(event) {
    if (event.button !== 0 || activeSheet().layoutLocked || document.body.classList.contains(
        'presentation-mode')) return;
    if (event.target.closest(
        'button,input,select,textarea,a,summary,[contenteditable="true"],[draggable="true"],[data-widget-resize],.axis-drop,.filter-picker'
      )) return;
    const element = event.target.closest('#reportCharts > .report-widget');
    const widget = activeSheet().widgets.find(item => item.id === element?.dataset.widgetId);
    if (!widget || widget.locked) return;
    const rect = element.getBoundingClientRect();
    surfaceDrag = {
      id: widget.id,
      element,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false
    };
  }

  function moveSurfaceDrag(event) {
    const state = surfaceDrag;
    if (!state || event.pointerId !== state.pointerId) return;
    if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) <
      6) return;
    const widget = activeSheet().widgets.find(item => item.id === state.id);
    if (!widget || widget.locked) {
      finishSurfaceDrag(event, true);
      return;
    }
    if (!state.moved) {
      state.moved = true;
      state.element.setPointerCapture?.(event.pointerId);
      document.body.classList.add('report-surface-dragging');
      hideReportTooltip();
    }
    event.preventDefault();
    scrollReportCanvasAtEdge(event);
    state.candidate = reportGridDropCandidate({
      clientX: event.clientX - state.offsetX + 1,
      clientY: event.clientY - state.offsetY + 1
    }, widget);
    state.valid = canPlaceReportWidget(state.candidate, activeSheet().widgets);
    showGridPlacementPreview(state.candidate, state.valid);
  }

  function finishSurfaceDrag(event, cancelled = false) {
    const state = surfaceDrag;
    if (!state || (event.pointerId != null && event.pointerId !== state.pointerId)) return;
    surfaceDrag = null;
    document.body.classList.remove('report-surface-dragging');
    clearGridPlacementPreview();
    if (!state.moved) return;
    suppressSurfaceClick = true;
    setTimeout(() => {
      suppressSurfaceClick = false;
    }, 0);
    if (!cancelled && state.valid) {
      const widget = activeSheet().widgets.find(item => item.id === state.id);
      if (widget) {
        widget.gridColumn = state.candidate.gridColumn;
        widget.gridRow = state.candidate.gridRow;
        state.element.style.cssText = reportGridStyle(widget);
        normalizeReportGrid(activeSheet());
        updateReportCanvasGuides();
        persistReporting();
      }
    }
    if (state.element.hasPointerCapture?.(state.pointerId)) state.element.releasePointerCapture(
      state.pointerId);
  }

  function installCompactSheetToolbar() {
    const toolbar = document.querySelector('.sheet-toolbar');
    const actions = toolbar.querySelector('.sheet-actions');
    const second = document.createElement('div');
    second.className = 'sheet-actions sheet-actions-secondary';
    ['refreshAllReports', 'presentationMode', 'reportLock'].forEach(
      id => {
        const button = $(id);
        if (button) second.append(button);
      });
    actions.after(second);
    actions.insertBefore($('duplicateReportSheet'), $('deleteReportSheet'));
    toolbar.querySelectorAll('button').forEach(button => {
      if (!button.title) button.title = button.textContent.trim();
    });
    document.querySelectorAll('.report-controls .report-note:not([data-sidebar-module-title])')
      .forEach(node => node.remove());
    if ($('reportSaveState')) $('reportSaveState').hidden = true;
  }

  function startWidgetResize(event) {
    if (activeSheet().layoutLocked) return;
    const handle = event.target.closest('[data-widget-resize]');
    if (!handle) return;
    const widget = activeSheet().widgets.find(item => item.id === handle.dataset.widgetResize),
      host = $('reportCharts');
    if (!widget || widget.locked || !host) return;
    event.preventDefault();
    const rect = host.getBoundingClientRect(),
      frame = $('reportCanvasScroll');
    moduleResizeState = {
      id: widget.id,
      startX: event.clientX,
      startY: event.clientY,
      colSpan: widget.colSpan,
      rowSpan: widget.rowSpan,
      cellWidth: (rect.width + 6 * (Number($('reportCanvasInner').style.zoom) || 1)) /
        REPORT_GRID.columns,
      rowHeight: 20 * (Number($('reportCanvasInner').style.zoom) || 1),
      scrollLeft: frame.scrollLeft,
      scrollTop: frame.scrollTop
    };
    handle.setPointerCapture?.(event.pointerId)
  }

  function resizeWidgetOnMove(event) {
    if (!moduleResizeState) return;
    const state = moduleResizeState,
      widget = activeSheet().widgets.find(item => item.id === state.id),
      el = widgetElement(state.id);
    if (!widget || !el) return;
    scrollReportCanvasAtEdge(event);
    const frame = $('reportCanvasScroll'),
      limits = reportModuleLimits(widget);
    const colSpan = Math.max(limits.minColumns, Math.min(REPORT_GRID.columns + 1 - widget
      .gridColumn, state.colSpan +
      Math.round((event.clientX - state.startX + frame.scrollLeft - state.scrollLeft) / state
        .cellWidth)));
    const rowSpan = Math.max(limits.minRows, Math.min(80, state.rowSpan + Math.round((event
      .clientY - state.startY + frame.scrollTop - state.scrollTop) / state.rowHeight)));
    const candidate = {
      ...widget,
      colSpan,
      rowSpan
    };
    const valid = canPlaceReportWidget(candidate, activeSheet().widgets);
    showGridPlacementPreview(candidate, valid);
    if (!valid) return;
    widget.colSpan = colSpan;
    widget.rowSpan = rowSpan;
    el.style.cssText = reportGridStyle(widget);
  }

  function finishWidgetResize() {
    if (!moduleResizeState) return;
    moduleResizeState = null;
    clearGridPlacementPreview();
    normalizeReportGrid(activeSheet());
    updateReportCanvasGuides();
    persistReporting()
  }
  let activeChartTooltipMark = null;

  function reportHoverTooltip() {
    let tooltip = document.getElementById('reportHoverTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'reportHoverTooltip';
      tooltip.className = 'report-hover-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      document.body.append(tooltip)
    }
    return tooltip
  }

  function positionReportTooltip(event) {
    const tooltip = reportHoverTooltip(),
      gap = 14;
    let left = event.clientX + gap,
      top = event.clientY + gap;
    if (left + tooltip.offsetWidth > window.innerWidth - 8) left = event.clientX - tooltip
      .offsetWidth - gap;
    if (top + tooltip.offsetHeight > window.innerHeight - 8) top = event.clientY - tooltip
      .offsetHeight - gap;
    tooltip.style.left = `${Math.max(8,left)}px`;
    tooltip.style.top = `${Math.max(8,top)}px`
  }

  function showReportTooltip(event) {
    const mark = event.target instanceof Element ? event.target.closest('[data-chart-tooltip]') :
      null;
    if (!mark || mark.closest('.spreadsheet-wrap,.metric-card')) return;
    activeChartTooltipMark = mark;
    const tooltip = reportHoverTooltip();
    tooltip.textContent = mark.getAttribute('data-chart-tooltip') || '';
    tooltip.classList.add('visible');
    positionReportTooltip(event)
  }

  function moveReportTooltip(event) {
    if (!activeChartTooltipMark) return;
    const mark = event.target instanceof Element ? event.target.closest('[data-chart-tooltip]') :
      null;
    if (mark !== activeChartTooltipMark) {
      hideReportTooltip();
      return
    }
    positionReportTooltip(event)
  }

  function hideReportTooltip() {
    if (!activeChartTooltipMark) return;
    activeChartTooltipMark = null;
    document.getElementById('reportHoverTooltip')?.classList.remove('visible')
  }

  function handleReportCrossFilter() {}

  function togglePresentation() {
    setPresentationMode(!document.body.classList.contains('presentation-mode'))
  }

  function cancelWidgetEdit() {}

  function handleModuleDateFilterDrop(event) {
    const fieldNode = event.target.closest('[data-field-kind][data-field-id]');
    if (fieldNode) return;
    let field;
    try {
      field = JSON.parse(event.dataTransfer?.getData('application/json') || '{}')
    } catch {
      return
    }
    if (field.kind !== 'dimension') return;
    const definition = customAttributes.find(item => item.id === field.id),
      parts = (definition?.source || '').split('.'),
      isDate = definition?.type === 'date' || (parts.length === 2 && fieldType(...parts) ===
        'date');
    if (!isDate) {
      toast('Only Date Dictionary fields can be used in the Date Filter.');
      return
    }
    event.preventDefault();
    const drop = event.target.closest('[data-module-datefilterdrop],[data-module-filterdrop]'),
      widget = activeSheet().widgets.find(item => String(item.id) === String(drop?.dataset
        .widgetId));
    if (!widget) return;
    normalizeDateFilters(widget.config);
    if (!widget.config.dateFiltersDraft.some(filter => filter.dimension === field.id)) {
      widget.config.dateFiltersDraft.push({
        id: 'date_' + Date.now(),
        role: 'cohort',
        dimension: field.id,
        enabled: true,
        range: {
          period: 'ytd'
        }
      });
      persistReporting();
      renderSheet();
    }
  }

  function removeModuleDateFilter(widget, id) {
    normalizeDateFilters(widget.config);
    widget.config.dateFiltersDraft = widget.config.dateFiltersDraft.filter(filter => filter
      .dimension !== id);
    widget.config.dateFilters = widget.config.dateFilters.filter(filter => filter.dimension !==
      id);
    widget.config.dateFilterDimensions = (widget.config.dateFilterDimensions || []).filter(item =>
      item !== id);
    markWidgetStale(widget);
    persistReporting();
    renderSheet()
  }

  function handleModuleFilterDrop(event) {
    const fieldNode = event.target.closest('[data-field-kind][data-field-id]');
    if (fieldNode) return;
    let field;
    try {
      field = JSON.parse(event.dataTransfer?.getData('application/json') || '{}')
    } catch {
      return
    }
    if (field.kind !== 'dimension') return;
    const definition = customAttributes.find(item => item.id === field.id);
    if (definition?.type === 'date') {
      handleModuleDateFilterDrop(event);
      return;
    }
    event.preventDefault();
    const drop = event.target.closest('[data-module-filterdrop]'),
      widget = activeSheet().widgets.find(item => String(item.id) === String(drop?.dataset
        .widgetId));
    if (!widget) return;
    const draft = widget.config.filterDraft || (widget.config.filterDraft = []);
    if (draft.some(filter => filter.dimension === field.id)) {
      toast('That dimension already filters this module.');
      return
    }
    draft.push({
      dimension: field.id,
      operator: 'eq',
      includeValues: [],
      excludedValues: []
    });
    persistReporting();
    renderSheet()
  }

  function applyModuleFilters(widget) {
    if (!moduleFiltersChanged(widget)) return;
    widget.config.filters = JSON.parse(JSON.stringify(widget.config.filterDraft || []));
    markWidgetStale(widget);
    persistReporting();
    renderSheet();
    if ($('reportStatus')) $('reportStatus').textContent =
      `Dimension filters applied to “${widget.name||'Report module'}”. Refresh that module to update its results.`
  }

  function clearModuleFilters(widget) {
    if (!(widget.config.filters?.length || widget.config.filterDraft?.length)) return;
    widget.config.filters = [];
    widget.config.filterDraft = [];
    markWidgetStale(widget);
    persistReporting();
    renderSheet();
    if ($('reportStatus')) $('reportStatus').textContent =
      `Dimension filters cleared for “${widget.name||'Report module'}”. Refresh that module to update its results.`
  }

  function removeModuleFilter(widget, index) {
    widget.config.filterDraft.splice(index, 1);
    persistReporting();
    renderSheet()
  }

  function buildStudioInstance() {
    const definitionText = collectDefinitionSource(),
      run = appState ? {
        count: appState.count,
        hist: appState.hist,
        masterSeed: appState.masterSeed,
        now: appState.now instanceof Date ? appState.now.toISOString() : appState.now,
        campaign: appState.campaign,
        options: appState.options
      } : JSON.parse(localStorage.getItem('syntheticGeneratorLastRun') || 'null');
    persistReporting();
    return {
      format: 'subscription-data-studio-instance',
      version: 1,
      instanceId: localStorage.getItem('syntheticGeneratorInstanceId') || createInstanceId(),
      savedAt: new Date().toISOString(),
      generator: {
        generated: !!run,
        run,
        count: Number($('userCount').value) || 1,
        hist: Number($('historyDays').value) || 365,
        masterSeed: Number($('seed').value) || 0,
        options: {
          optDiscount: $('optDiscount').checked,
          optFailures: $('optFailures').checked,
          optChanges: $('optChanges').checked,
          optCancels: $('optCancels').checked,
          optOneTime: $('optOneTime').checked,
          optChargebacks: $('optChargebacks').checked,
          distributionMode: $('distributionMode')?.value || 'weighted'
        }
      },
      workspace: {
        customAttributes,
        customMetrics,
        reportSheets,
        activeSheetId,
        sheetCounter,
        reportSidebarWidth,
        sidebarLayoutVersion: 3,
        definitionHistory,
        definitionVersions,
        definitionText,
        appliedDefinitionText: serializeLookmlDefinitions(),
        evaluationText: $('evaluationCode')?.value || '',
        evaluationSampleCount: $('evaluationSampleCount')?.value || '5'
      }
    }
  }

  function encodeStudioInstance(instance) {
    const bytes = new TextEncoder().encode(JSON.stringify(instance)),
      binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return 'SDS1.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  function decodeStudioInstance(code) {
    const token = String(code || '').trim();
    if (!token.startsWith('SDS1.')) throw new Error('Instance ID should start with SDS1.');
    const base64 = token.slice(5).replace(/-/g, '+').replace(/_/g, '/'),
      binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4)),
      bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes))
  }

  function shareStudioInstance() {
    try {
      const instance = buildStudioInstance(),
        token = encodeStudioInstance(instance);
      localStorage.setItem('syntheticGeneratorInstanceId', instance.instanceId);
      document.cookie =
        `sds_instance_id=${encodeURIComponent(instance.instanceId)}; path=/; max-age=31536000; SameSite=Lax`;
      const box = $('instanceShareCode');
      box.value = token;
      $('shareInstanceDialog').showModal();
      box.focus();
      box.select()
    } catch (error) {
      toast('Could not create the shareable instance ID: ' + (error.message || error))
    }
  }
  async function saveStudioInstance() {
    try {
      const instance = buildStudioInstance(),
        contents = JSON.stringify(instance, null, 2);
      localStorage.setItem('syntheticGeneratorInstanceId', instance.instanceId);
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'subscription_data_studio_instance.json',
            types: [{
              description: 'Subscription Data Studio instance',
              accept: {
                'application/json': ['.json']
              }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(contents);
          await writable.close();
          toast('Studio instance saved to the selected folder.');
          return
        } catch (error) {
          if (error?.name === 'AbortError') return;
          console.error('Studio instance save failed:', error);
          toast('Save failed: ' + (error.message || 'Could not write the Studio instance.'));
          return
        }
      }
      download('subscription_data_studio_instance.json', contents, 'application/json');
      toast('Studio instance downloaded.')
    } catch (error) {
      toast('Could not save the Studio instance: ' + (error.message || error))
    }
  }
  async function loadStudioInstance(file) {
    const instance = JSON.parse(await file.text());
    await applyStudioInstance(instance)
  }
  async function applyStudioInstance(instance) {
    if (instance?.format !== 'subscription-data-studio-instance' || ![1, 2].includes(instance
        .version) || !instance.workspace || !instance.generator) throw new Error(
      'This is not a supported Subscription Data Studio instance.');
    const w = instance.workspace,
      g = instance.generator;
    if (!Array.isArray(w.reportSheets) || !Array.isArray(w.customAttributes) || !Array.isArray(w
        .customMetrics)) throw new Error(
      'The instance file is missing its dictionary or report sheets.');
    definitionVersions = Array.isArray(w.definitionVersions) ? w.definitionVersions.slice(-10) :
      [];
    lastSavedDefinitionSource = w.appliedDefinitionText ?? w.definitionText ?? null;
    try {
      localStorage.setItem('studioDefinitionVersions', JSON.stringify(definitionVersions))
    } catch {}
    customAttributes = w.customAttributes;
    customMetrics = w.customMetrics;
    const imported = resolveLookmlDefinitions(w.appliedDefinitionText ?? w.definitionText ??
      serializeLookmlDefinitions());
    customAttributes = imported.dimensions;
    customMetrics = imported.measures;
    reportSheets = w.reportSheets;
    reportSidebarWidth = restoredSidebarWidth(w.reportSidebarWidth, w.sidebarLayoutVersion);
    definitionRevision++;
    for (const sheet of reportSheets) {
      sheet.filters = Array.isArray(sheet.filters) ? sheet.filters : [];
      sheet.filterDraft = Array.isArray(sheet.filterDraft) ? sheet.filterDraft : JSON.parse(JSON
        .stringify(sheet.filters));
    }
    activeSheetId = w.activeSheetId || reportSheets[0]?.id || 'sheet_1';
    sheetCounter = Number(w.sheetCounter) || reportSheets.length;
    definitionHistory = Array.isArray(w.definitionHistory) ? w.definitionHistory : [];
    if (instance.instanceId) {
      localStorage.setItem('syntheticGeneratorInstanceId', instance.instanceId);
      document.cookie =
        `sds_instance_id=${encodeURIComponent(instance.instanceId)}; path=/; max-age=31536000; SameSite=Lax`
    }
    $('userCount').value = g.count || 50000;
    $('historyDays').value = g.hist || 1825;
    $('seed').value = g.masterSeed || '';
    for (const [key, value] of Object.entries(g.options || {}))
      if ($(key)) $(key).checked = !!value;
    const editor = $('definitionEditor');
    if (editor) {
      editor.value = w.definitionText || serializeLookmlDefinitions();
      editor.dataset.initialized = 'true';
      persistDictionaryDraft(editor.value)
    }
    const evaluation = $('evaluationCode');
    if (evaluation) {
      evaluation.value = w.evaluationText || '';
      persistEvaluationDraft(evaluation.value)
    }
    if ($('evaluationSampleCount')) $('evaluationSampleCount').value = w
      .evaluationSampleCount || '5';
    persistReporting();
    persistDefinitionHistory();
    renderDictionary();
    renderSheet();
    if (g.generated && g.run) make(g.run);
    else {
      appState = null;
      tables = null;
      $('summaryText').textContent =
        'Studio setup loaded. Generate synthetic data to populate the reports.'
    }
    toast('Studio instance loaded.')
  }

  function matchesFilter(filter, user, plan, date, rowMap) {
    const value = dimensionValue(filter.dimension, user, plan, date, rowMap),
      blank = value === '' || value === 'Unknown' || value === '(Unknown)' || value == null,
      op = filter.operator || 'eq';
    if (op === 'blank') return blank;
    if (op === 'not_blank') return !blank;
    const includes = filter.includeValues,
      excludes = filter.excludedValues;
    if (Array.isArray(includes) || Array.isArray(excludes)) {
      const inc = includes || [],
        exc = excludes || [];
      const normalize = value => String(value) === 'Unknown' ? '(Unknown)' : String(value);
      return (!inc.length || inc.map(normalize).includes(normalize(value))) && !exc.map(normalize)
        .includes(normalize(value))
    }
    const values = Array.isArray(filter.values) ? filter.values : String(filter.value || '')
      .split(',').map(v => v.trim()).filter(Boolean),
      has = values.includes(String(value));
    if (op === 'not_in' || op === 'neq') return !has;
    if (op === 'in' || op === 'eq') return values.length === 0 || has;
    return false
  }

  function renderReportFieldPalette() {
    const dimensions = customAttributes.filter(a => a.type !== 'date').map(a => ({
      id: a.id,
      label: a.name,
      kind: 'dimension',
      leaf: fieldLabel(a.id, 'dimension'),
      source: a.source
    }));
    const dates = customAttributes.filter(a => a.type === 'date').map(a => ({
      id: a.id,
      label: a.name,
      kind: 'dimension',
      leaf: a.lookmlName || lookmlIdentifier(a.id || a.name),
      source: a.source
    }));
    const metrics = customMetrics.map(m => ({
      id: m.id,
      label: m.label,
      kind: 'metric',
      leaf: fieldLabel(m.id, 'metric'),
      source: m.source
    }));
    const tree = (items, title, key) => {
      const groups = new Map();
      for (const field of items) {
        const label = field.label || 'Unlabeled';
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(field)
      }
      const content = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label,
        fields
      ]) => {
        fields.sort((a, b) => a.leaf.localeCompare(b.leaf));
        return `<details class="dictionary-folder dictionary-label-group" data-field-label-group><summary>${htmlEscape(label)}</summary><div class="field-folder-items">${fields.map(field=>`<span class="dictionary-chip" draggable="true" data-field-kind="${field.kind}" data-field-id="${htmlEscape(field.id)}" data-field-search="${htmlEscape(`${field.label} ${field.leaf} ${field.source||''}`.toLowerCase())}" title="${htmlEscape(field.source||field.leaf)}">${field.kind==='metric'?'ƒ':'◇'} ${htmlEscape(field.leaf)}</span>`).join('')}</div></details>`
      }).join('');
      return `<details class="dictionary-folder" data-field-section="${key}"><summary>${title}</summary>${content||'<small class="palette-empty">No '+title.toLowerCase()+' defined in the Data Dictionary.</small>'}</details>`
    };
    $('reportFieldPalette').innerHTML = tree(dimensions, 'Dimensions', 'dimensions') + tree(dates,
      'Dates', 'dates') + tree(metrics, 'Measures', 'measures');
    applyReportFieldSearch();
  }

  function applyReportFieldSearch() {
    const query = $('reportFieldSearch')?.value.trim().toLowerCase() || '';
    document.querySelectorAll('#reportFieldPalette [data-field-search]').forEach(field => field
      .hidden = !!query && !field.dataset.fieldSearch.includes(query));
    document.querySelectorAll('#reportFieldPalette [data-field-label-group]').forEach(group => {
      group.hidden = !group.querySelector('[data-field-search]:not([hidden])')
    });
    document.querySelectorAll('#reportFieldPalette [data-field-section]').forEach(section => {
      const groups = [...section.querySelectorAll('[data-field-label-group]')];
      section.hidden = !!query && groups.length > 0 && !groups.some(group => !group.hidden)
    })
  }

  function lookmlIdentifier(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(
      /^([^a-z_])/, '_$1').replace(/^_+|_+$/g, '') || 'field'
  }

  function lookmlToExpression(value) {
    return String(value || '').replace(/\$\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\}/g, '[$1.$2]')
      .replace(/\$\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '[dimension:$1]').replace(/;;\s*$/, '')
      .trim()
  }

  function expressionToLookml(value) {
    return String(value || '').replace(/\[dimension:([a-zA-Z_][a-zA-Z0-9_]*)\]/g, (_, name) =>
      '$' + '{' + name + '}').replace(/\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/g, (_, table,
      column) => '$' + '{' + table + '.' + column + '}')
  }

  function quoteLookml(value) {
    return '"' + String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }

  function serializeLookmlDefinitions() {
    const blocks = [];
    for (const item of customAttributes) {
      const id = item.lookmlName || lookmlIdentifier(item.id || item.name),
        source = item.caseExpr ? expressionToLookml(item.caseExpr) : item.source ?
        expressionToLookml('[' + item.source + ']') : '';
      let lines = ['dimension: ' + id + ' {', '  label: ' + quoteLookml(item.name), '  type: ' + (
        item.type === 'date' ? 'date' : 'string')];
      if (item.datePart) lines.push('  date_part: ' + item.datePart);
      lines.push('  sql: ' + source + ' ;;', '}');
      blocks.push(lines.join('\n'))
    }
    for (const item of customMetrics) {
      const id = item.lookmlName || lookmlIdentifier(item.id || item.label),
        agg = item.kind === 'ratio' ? 'number' : item.aggregation || 'sum';
      let sql = item.kind === 'ratio' ? '{{' + (customMetrics.find(m => m.id === item.numerator)
          ?.lookmlName || metricMeta(item.numerator).label) + '}} / {{' + (customMetrics.find(m =>
          m.id === item.denominator)?.lookmlName || metricMeta(item.denominator).label) + '}}' :
        item.kind === 'column' ? expressionToLookml('[' + item.source + ']') : expressionToLookml(
          item.formula || '');
      let lines = ['measure: ' + id + ' {', '  label: ' + quoteLookml(item.label), '  type: ' +
        agg, '  sql: ' + sql + ' ;;', '  value_format: ' + (item.format === 'currency' ?
          'currency' : item.format === 'percent' ? 'percent' : 'numeric'), '}'
      ];
      const properties = [];
      if (item.factTable) properties.push('  fact_table: ' + item.factTable);
      if (item.percentScale) properties.push('  percent_scale: ' + item.percentScale);
      if (item.tableMode) properties.push('  table_mode: ' + item.tableMode, '  table_scope: ' +
        item.tableScope, '  table_partition: ' + item.tablePartition);
      if (item.tableOrder) properties.push('  table_order: ' + item.tableOrder);
      lines.splice(lines.length - 1, 0, ...properties);
      blocks.push(lines.join('\n'))
    }
    return [...reportParameters.map(p =>
      `parameter: ${p.name} {\n  type: ${p.type}\n  label: ${JSON.stringify(p.label)}\n  default: ${JSON.stringify(p.default)}${p.min!=null?'\n  min: '+p.min:''}${p.max!=null?'\n  max: '+p.max:''}${p.allowed_values?'\n  allowed_values: '+JSON.stringify(p.allowed_values):''}\n}`
    ), ...blocks].join('\n\n');
  }

  // Data Dictionary parsing and definition resolution
  function parseLookmlDefinitions(source) {
    const text = parseParameterDefinitions(String(source || '')).text,
      header = /\b(dimension|date|measure)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/g,
      blocks = [];
    let match;
    while ((match = header.exec(text))) {
      let depth = 1,
        end = header.lastIndex;
      for (; end < text.length && depth; end++) {
        if (text[end] === '{') depth++;
        else if (text[end] === '}') depth--
      }
      if (depth) throw new Error('Unclosed ' + match[1] + ' block: ' + match[2]);
      blocks.push({
        kind: match[1] === 'date' ? 'dimension' : match[1],
        id: match[2],
        body: text.slice(header.lastIndex, end - 1),
        raw: text.slice(match.index, end),
        start: match.index,
        end
      });
      header.lastIndex = end
    }
    if (!blocks.length && text.trim()) throw new Error(
      'No dimension or measure blocks found. Use dimension: name { … } or measure: name { … }.'
    );
    let previousEnd = 0;
    for (const block of blocks) {
      const outside = text.slice(previousEnd, block.start).replace(/^\s*(#.*)?$/gm, '').trim();
      if (outside) throw new Error('Unexpected text outside a definition block: ' + outside.slice(
        0, 50));
      previousEnd = block.end
    }
    if (text.slice(previousEnd).replace(/^\s*(#.*)?$/gm, '').trim()) throw new Error(
      'Unexpected text after the last definition block.');
    return blocks.map(block => {
      const props = {},
        lines = block.body.split(/\r?\n/);
      let active = '';
      for (const line of lines) {
        if (/^\s*#/.test(line)) continue;
        const prop = line.match(
          /^\s*(type|sql|value_format|label|date_part|percent_scale|table_scope|table_partition|table_order|table_mode|fact_table)\s*:\s*(.*)$/
        );
        if (prop) {
          active = prop[1];
          props[active] = (props[active] ? props[active] + '\n' : '') + prop[2];
          if (active === 'sql' && /;;\s*$/.test(props[active])) {
            props[active] = props[active].replace(/;;\s*$/, '').trim();
            active = ''
          }
          continue
        }
        if (active === 'sql') {
          props.sql += '\n' + line;
          if (/;;\s*$/.test(props.sql)) {
            props.sql = props.sql.replace(/;;\s*$/, '').trim();
            active = ''
          }
        } else if (line.trim()) throw new Error('Unsupported property in ' + block.kind +
          ' ' + block.id + ': ' + line.trim())
      }
      if (!props.sql) throw new Error(block.kind + ' ' + block.id +
        ' needs a sql: expression.');
      if (!props.type) throw new Error(block.kind + ' ' + block.id + ' needs a type:.');
      return {
        ...block,
        props,
        sql: lookmlToExpression(props.sql),
        label: (props.label || block.id).replace(/^['"]|['"]$/g, '')
      }
    })
  }

  function resolveLookmlDefinitions(source) {
    const previous = reportParameters;
    try {
      return resolveLookmlDefinitionsInternal(source);
    } catch (error) {
      reportParameters = previous;
      throw error;
    }
  }

  function resolveLookmlDefinitionsInternal(source) {
    const parameterSource = parseParameterDefinitions(String(source || ""));
    reportParameters = parameterSource.parameters;
    source = String(source).replace(/\$\{parameter\.([A-Za-z_]\w*)\}/g, (_, name) =>
      `PARAMETER('${name}')`);
    const parsed = parseLookmlDefinitions(source),
      dimensions = [],
      measures = [],
      allDimensionRefs = parsed.filter(block => block.kind === 'dimension').map(block => ({
        lookmlName: block.id,
        name: block.label
      })),
      dimensionIds = new Set(),
      measureIds = new Set(),
      fieldRef = /^\s*\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]\s*$/;
    for (const block of parsed.filter(b => b.kind === 'dimension')) {
      const {
        props,
        sql,
        label,
        id
      } = block;
      if (!['string', 'date'].includes(props.type.trim().toLowerCase())) throw new Error(
        'Dimension ' + id + ' type must be string or date.');
      const key = id.toLowerCase();
      if (dimensionIds.has(key)) throw new Error('Duplicate dimension block name: ' + id);
      dimensionIds.add(key);
      validateFormulaColumns(sql);
      validateCustomDimensionReferences(sql, allDimensionRefs, 'dimension ' + id);
      const direct = sql.match(fieldRef);
      if (!direct) validateFormulaSyntax(sql, 'dimension ' + id);
      const old = customAttributes.find(a => a.lookmlName === id) || customAttributes.find(a => !a
          .lookmlName && a.name === label && !dimensions.some(d => d.id === a.id)),
        datePart = (props.date_part || '').trim().toLowerCase();
      if (datePart && !['year', 'month', 'week', 'weekday', 'day', 'quarter'].includes(datePart))
        throw new Error('Unsupported date_part in dimension ' + id + '.');
      dimensions.push({
        id: old?.id || 'attr_' + lookmlIdentifier(id),
        lookmlName: id,
        name: label,
        source: direct ? direct[1] + '.' + direct[2] : '',
        datePart,
        caseExpr: direct ? '' : sql,
        description: '',
        folder: 'General',
        tags: '',
        type: props.type.trim().toLowerCase()
      })
    }
    const pending = parsed.filter(b => b.kind === 'measure'),
      allNames = new Map();
    for (const m of pending) allNames.set(m.id.toLowerCase(), m.label);
    for (const [key, value] of Object.entries(REPORT_METRICS)) allNames.set(key.toLowerCase(),
      value.label);
    for (const m of customMetrics) allNames.set(m.id.toLowerCase(), m.label);
    const resolveMetric = ref => {
      const normalized = ref.trim().toLowerCase(),
        saved = customMetrics.find(m => m.lookmlName?.toLowerCase() === normalized || m.id
          .toLowerCase() === normalized) || customMetrics.find(m => m.label.toLowerCase() ===
          normalized);
      if (saved) return saved.id;
      const pendingItem = pending.find(m => m.id.toLowerCase() === normalized) || pending.find(
        m => m.label.toLowerCase() === normalized);
      if (pendingItem) return customMetrics.find(m => m.lookmlName === pendingItem.id)?.id ||
        'metric_' + lookmlIdentifier(pendingItem.id);
      return Object.keys(REPORT_METRICS).find(key => key.toLowerCase() === normalized ||
        REPORT_METRICS[key].label.toLowerCase() === normalized) || null
    };
    for (const block of pending) {
      const {
        props,
        sql,
        label,
        id
      } = block, key = id.toLowerCase();
      if (measureIds.has(key)) throw new Error('Duplicate measure block name: ' + id);
      measureIds.add(key);
      let aggregation = props.type.trim().toLowerCase().replace(/\(\)$/, '');
      if (aggregation === 'average') aggregation = 'avg';
      if (aggregation === 'numeric' || aggregation === 'number') aggregation = 'sum';
      if (!['sum', 'count', 'count_distinct', 'avg', 'min', 'max', 'table_sum', 'table_median',
          'table_mean', 'table_mode', 'table_avg', 'running_sum', 'running_difference_value',
          'running_difference_percent', 'previous_value', 'next_value', 'number'
        ].includes(aggregation)) throw new Error('Unsupported measure type ' + props.type +
        ' in ' + id + '.');
      const ratio = sql.match(/^\s*\{\{([^}]+)\}\}\s*\/\s*\{\{([^}]+)\}\}\s*$/),
        old = customMetrics.find(m => m.lookmlName === id) || customMetrics.find(m => !m
          .lookmlName && m.label === label && !measures.some(d => d.id === m.id));
      let item;
      if (ratio) {
        const numerator = resolveMetric(ratio[1]),
          denominator = resolveMetric(ratio[2]);
        if (!numerator || !denominator) throw new Error('Unknown measure reference in ' + id +
          '.');
        item = {
          id: old?.id || 'metric_' + lookmlIdentifier(id),
          lookmlName: id,
          label,
          kind: 'ratio',
          numerator,
          denominator,
          asPercent: props.value_format?.trim() === 'percent',
          aggregation: 'ratio',
          format: props.value_format?.trim() === 'currency' ? 'currency' : props.value_format
            ?.trim() === 'percent' ? 'percent' : 'number',
          description: '',
          folder: 'General',
          tags: ''
        }
      } else {
        validateFormulaColumns(sql);
        validateCustomDimensionReferences(sql, allDimensionRefs, 'measure ' + id);
        const direct = sql.match(fieldRef);
        if (!direct) validateFormulaSyntax(sql, 'measure ' + id);
        const format = (props.value_format || 'numeric').trim().toLowerCase();
        if (!['numeric', 'number', 'currency', 'percent', 'usd'].includes(format))
          throw new Error('Unsupported value_format in ' + id + '.');
        item = {
          id: old?.id || 'metric_' + lookmlIdentifier(id),
          lookmlName: id,
          label,
          kind: direct ? 'column' : 'formula',
          source: direct ? direct[1] + '.' + direct[2] : '',
          formula: direct ? '' : sql,
          aggregation: aggregation === 'number' ? 'sum' : aggregation,
          format: format === 'currency' || format === 'usd' ? 'currency' : format ===
            'percent' ? 'percent' : 'number',
          description: '',
          folder: 'General',
          tags: ''
        }
      }
      if (props.fact_table) {
        if (!ReportingTools.grains[props.fact_table.trim()]) throw new Error(
          'Unknown fact_table in ' + id);
        item.factTable = props.fact_table.trim()
      } else if (old?.factTable) item.factTable = old.factTable;
      if (item.format === 'percent') {
        item.percentScale = (props.percent_scale || old?.percentScale || (old ? 'points' :
          'fraction')).trim().toLowerCase();
        if (!['fraction', 'points'].includes(item.percentScale)) throw new Error(
          'percent_scale must be fraction or points in ' + id);
      }
      if (aggregation.startsWith('table_') || ['running_sum', 'running_difference_value',
          'running_difference_percent', 'previous_value', 'next_value'
        ].includes(aggregation)) {
        item.tableMode = (props.table_mode || old?.tableMode || (old && aggregation.startsWith(
            'table_') ? 'source' : 'window'))
          .trim();
        item.tableScope = (props.table_scope || old?.tableScope || 'visible').trim();
        item.tablePartition = (props.table_partition || old?.tablePartition || 'series').trim();
        if (!['source', 'window'].includes(item.tableMode) || !['visible', 'filtered'].includes(
            item.tableScope))
          throw new Error('Invalid table mode, scope, or partition in ' + id);
        const resolveWindowField = name => dimensions.find(d => d.lookmlName === name || d.id ===
          name);
        if (!['series', 'category', 'all'].includes(item.tablePartition)) {
          item.tablePartitionFields = item.tablePartition.split(',').map(name => {
            const dim = resolveWindowField(name.trim());
            if (!dim) throw Error('Unknown table_partition dimension: ' + name.trim());
            if (dim.type === 'date') throw Error(
              'Dates are not allowed in table_partition. Move ' + name.trim() +
              ' to table_order.');
            return dim.id;
          });
          if (new Set(item.tablePartitionFields).size !== item.tablePartitionFields.length)
            throw Error('Repeated table_partition dimension in ' + id);
        }
        item.tableOrder = (props.table_order || '').trim();
        item.tableOrderFields = item.tableOrder ? item.tableOrder.split(',').map(term => {
          const match = term.trim().match(/^([a-zA-Z_]\w*)(?:\s+(asc|desc))?$/i);
          if (!match) throw Error('Use table_order: field_name asc, other_field desc in ' +
            id);
          const dim = resolveWindowField(match[1]);
          if (!dim) throw Error('Unknown table_order field: ' + match[1]);
          return {
            id: dim.id,
            direction: (match[2] || 'asc').toLowerCase()
          };
        }) : [];
        if (new Set(item.tableOrderFields.map(f => f.id)).size !== item.tableOrderFields.length)
          throw Error('Repeated table_order field in ' + id);
        if (item.tableMode !== 'window' && !aggregation.startsWith('table_')) throw Error(
          'Running/neighbor functions require table_mode: window.');
        if (item.tableMode === 'window') {
          const reference = sql.match(/^\s*\{\{([^}]+)\}\}\s*$/);
          if (!reference) throw new Error(
            'Window table calculations need one base measure: sql: {{measure_name}} ;;');
          item.tableBaseMetric = resolveMetric(reference[1]);
          if (!item.tableBaseMetric) throw new Error('Unknown table calculation measure in ' +
            id);
        }
      }
      measures.push(item)
    }
    for (const dim of dimensions) validateCustomMeasureReferences(dim.caseExpr, measures,
      'dimension/date ' + dim.lookmlName);
    for (const metric of measures) validateCustomMeasureReferences(metric.formula, measures,
      'measure ' + metric.lookmlName);
    validateDefinitionDependencyGraph(dimensions, measures);
    for (const item of measures) {
      const lineage = ReportingTools.lineage(item, measures, dimensions);
      if (lineage.errors.length) throw new Error(item.lookmlName + ': ' + lineage.errors.join(
        ' '));
    }
    for (const measure of measures) measure.parameterDefaults = Object.fromEntries(
      reportParameters.map(p => [p.name, p.default]));
    return {
      dimensions,
      measures
    };
  }

  function availableColumnValues(table, column) {
    const rows = tables?.[table]?.preview || [];
    return [...new Set(rows.map(r => r[column]).filter(v => v !== '' && v != null).map(String))]
      .sort((a, b) => a.localeCompare(b, undefined, {
        numeric: true
      })).slice(0, 30)
  }

  function definitionTableFor(block) {
    const ref = block.raw.match(/\$\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\}/) || block.raw
      .match(/\[([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\]/);
    return ref?.[1] || 'custom_definitions'
  }

  function definitionTypeFor(block) {
    return block.kind === 'measure' ? 'measure' : block.props.type.trim().toLowerCase() ===
      'date' ? 'date' : 'dimension'
  }

  function definitionCodeCard(block, open = false) {
    const title = `${block.kind}: ${block.id} · ${block.label}`,
      fields = Object.entries(COLUMNS).flatMap(([table, columns]) => columns.map(column => ({
        table,
        column
      }))),
      dateTools = ['DATE', 'TIMESTAMP', 'YEAR', 'MONTH', 'DAY', 'WEEK', 'WEEKDAY', 'QUARTER',
        'DATE_TRUNC', 'DATEDIFF', 'DATE_ADD'
      ];
    return `<details class="definition-code-card" data-definition-code-card data-definition-type="${definitionTypeFor(block)}" data-definition-id="${htmlEscape(block.id)}"${open?' open':''}><summary>${htmlEscape(title)}</summary><div class="definition-code-tools"><label>Insert column <select data-insert-column><option value="">Choose column…</option>${fields.map(f=>`<option value="${htmlEscape('${'+f.table+'.'+f.column+'}')}">${htmlEscape(f.table+'.'+f.column)}</option>`).join('')}</select></label><label>Date / SQL functions <select data-insert-function><option value="">Choose function…</option>${dateTools.map(name=>`<option value="${name}">${name}</option>`).join('')}<option value="CASE">CASE WHEN…</option><option value="CONCAT">CONCAT</option><option value="LOWER">LOWER</option><option value="UPPER">UPPER</option><option value="COALESCE">COALESCE</option><option value="SAFE_DIVIDE">SAFE_DIVIDE</option><option value="COUNT_IF">COUNT_IF</option><option value="REGEXP_EXTRACT">REGEXP_EXTRACT</option><option value="ABS">ABS</option><option value="ROUND">ROUND</option><option value="HOUR">HOUR</option><option value="MINUTE">MINUTE</option><option value="SECOND">SECOND</option><option value="DAYOFYEAR">DAYOFYEAR</option><option value="DAYNAME">DAYNAME</option><option value="MONTHNAME">MONTHNAME</option><option value="SUBSTR">SUBSTR</option><option value="LENGTH">LENGTH</option><option value="REPLACE">REPLACE</option><option value="MOD">MOD</option><option value="POWER">POWER</option><option value="+">Addition (+)</option><option value="-">Subtraction (−)</option><option value="*">Multiplication (×)</option><option value="/">Division (÷)</option></select></label><button type="button" data-remove-definition>Remove definition</button></div><textarea class="definition-code" data-definition-code spellcheck="false">${htmlEscape(block.raw)}</textarea><div class="definition-suggestions code-suggestions" data-code-suggestions hidden></div></details>`
  }

  function definitionColumnRow(table, column) {
    const type = fieldType(table, column),
      values = availableColumnValues(table, column),
      options = values.length ?
      `<option value="">Sample values (${values.length})</option>${values.map(v=>`<option value="${htmlEscape(v)}">${htmlEscape(v)}</option>`).join('')}` :
      '<option value="">Generate data to view values</option>';
    const actions =
      `<button type="button" data-add-definition="dimension" data-table="${table}" data-column="${column}">+ Dimension</button>${type==='date'?`<button type="button" data-add-definition="date" data-table="${table}" data-column="${column}">+ Date</button>`:''}${type==='number'?`<button type="button" data-add-definition="measure" data-table="${table}" data-column="${column}">+ Measure</button>`:''}`;
    return `<div class="dictionary-column-row" data-column-row data-type="${type}"><code>${htmlEscape(column)}</code><span class="column-type">${type}</span><select class="column-values" aria-label="Available values for ${htmlEscape(column)}">${options}</select><div class="column-definition-actions">${actions}</div></div>`
  }

  function tableDefinitionCard(table, label, parsed, focusId = '') {
    const columns = COLUMNS[table] || [],
      blocks = parsed.filter(b => definitionTableFor(b) === table),
      thead =
      '<div class="dictionary-column-head"><span>Column</span><span>Type</span><span>Sample values</span><span>Actions</span></div>',
      fields = columns.map(col => definitionColumnRow(table, col)).join(''),
      codeBlocks = blocks.map(b => definitionCodeCard(b, b.id === focusId)).join('');
    return `<details class="dictionary-table-card" data-table-card="${table}"${table===TABLES[0][0]||blocks.some(b=>b.id===focusId)?' open':''}><summary><span>${htmlEscape(table)}</span><small>${label} · ${columns.length} columns</small></summary><div class="table-field-wrap"><div class="table-definition-actions"><button type="button" class="dictionary-auto-add" data-auto-add-table="${table}">Auto-add dimensions &amp; measures</button></div><div class="dictionary-column-head">${thead.replace('<div class="dictionary-column-head">','').replace('</div>','')}</div><div class="dictionary-column-list">${fields}</div><details class="table-definition-blocks" open><summary>Definitions (${blocks.length})</summary>${codeBlocks||'<div class="definition-empty">No definitions yet. Add one from a column above.</div>'}</details></div></details>`
  }

  function collectDefinitionSource() {
    syncDefinitionCards();
    const editor = $('definitionEditor');
    if (!editor) return '';
    editor.dataset.initialized = 'true';
    persistDictionaryDraft(editor.value);
    return editor.value
  }

  function applyDictionaryMode(mode) {
    dictionaryMode = mode;
    document.querySelectorAll('[data-dictionary-view]').forEach(b => b.classList.toggle('active',
      b.dataset.dictionaryView === mode));
    document.querySelectorAll('[data-column-row]').forEach(row => row.hidden = mode !== 'tables');
    document.querySelectorAll('[data-definition-code-card]').forEach(card => {
      const type = card.dataset.definitionType;
      card.hidden = mode === 'tables' ? false : mode === 'sql' ? false : type !== mode
    });
    document.querySelectorAll('[data-table-card]').forEach(card => {
      card.hidden = mode === 'tables' ? ![...card.querySelectorAll('[data-column-row]')]
        .length : ![...card.querySelectorAll('[data-definition-code-card]:not([hidden])')]
        .length
    });
    document.querySelectorAll('.table-definition-actions,.table-definition-blocks').forEach(el =>
      el.hidden = mode === 'tables' ? false : el.classList.contains('table-definition-actions'))
  }

  function renderDefinitionTables() {
    renderDefinitionCardStack();
  }

  function makeDefinitionBlock(table, column, kind, id) {
    const type = kind === 'date' ? 'date' : kind === 'measure' ? 'sum' : fieldType(table,
        column) === 'date' ? 'date' : 'string',
      baseLabel = column.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      label = kind === 'measure' ? `${baseLabel} Total` : baseLabel,
      field = '${' + table + '.' + column + '}',
      format = /amount|revenue|refund|chargeback|cost|tax|price|discount/i.test(column) ?
      'currency' : 'numeric';
    return kind === 'measure' ?
      `measure: ${id} {\n  label: ${quoteLookml(label)}\n  type: sum\n  sql: ${field} ;;\n  value_format: ${format}\n}` :
      `dimension: ${id} {\n  label: ${quoteLookml(label)}\n  type: ${type}\n  sql: ${field} ;;\n}`
  }

  function addTableDefinition(table, column, kind) {
    const editor = $('definitionEditor');
    let current;
    try {
      current = collectDefinitionSource();
      const parsed = parseLookmlDefinitions(current),
        base = lookmlIdentifier(`${table}_${column}_${kind}`);
      let id = base,
        n = 2;
      while (parsed.some(b => b.kind === (kind === 'measure' ? 'measure' : 'dimension') && b
          .id === id)) id = `${base}_${n++}`;
      editor.value = [current, makeDefinitionBlock(table, column, kind, id)].filter(Boolean).join(
        '\n\n');
      collectDefinitionSource();
      renderDefinitionTables(id);
      $('definitionStatus').textContent = 'Added ' + kind + ' for ' + table + '.' + column +
        '. Edit the expanded code block, then save definitions.';
      $('definitionStatus').classList.remove('error');
      return id
    } catch (error) {
      $('definitionStatus').textContent =
        'Save or correct the current code block before adding another field: ' + error.message;
      $('definitionStatus').classList.add('error')
    }
  }

  function autoAddTableFields(table) {
    const editor = $('definitionEditor');
    try {
      const current = collectDefinitionSource(),
        parsed = parseLookmlDefinitions(current),
        existing = new Set(parsed.map(b => b.id)),
        blocks = [];
      for (const column of COLUMNS[table] || []) {
        const type = fieldType(table, column);
        if (type === 'number' && column.endsWith('_id')) continue;
        const kind = type === 'number' ? 'measure' : type === 'date' ? 'date' : 'dimension',
          base = lookmlIdentifier(`${table}_${column}_${kind}`);
        if (existing.has(base)) continue;
        blocks.push(makeDefinitionBlock(table, column, kind, base));
        existing.add(base)
      }
      editor.value = [current, ...blocks].filter(Boolean).join('\n\n');
      collectDefinitionSource();
      renderDefinitionTables();
      $('definitionStatus').textContent =
        `Added ${blocks.length} definitions from ${table} columns.`;
      $('definitionStatus').classList.remove('error');
      if (!blocks.length) $('definitionStatus').classList.remove('error')
    } catch (error) {
      $('definitionStatus').textContent =
        'Save or correct the current code block before auto-adding fields: ' + error.message;
      $('definitionStatus').classList.add('error')
    }
  }

  function codeDefinitionSuggestions(textarea) {
    const end = textarea.selectionStart,
      before = textarea.value.slice(0, end),
      line = before.split('\n').at(-1),
      lastSql = before.toLowerCase().lastIndexOf('sql:'),
      sqlContext = lastSql > before.lastIndexOf(';;');
    const fields = [...Object.entries(COLUMNS).flatMap(([table, columns]) => columns.map(column =>
      ({
        label: table + '.' + column,
        insert: '${' + table + '.' + column + '}',
        table,
        column,
        type: fieldType(table, column)
      }))), ...customAttributes.map(dim => ({
      label: 'dimension: ' + (dim.lookmlName || lookmlIdentifier(dim.name)),
      insert: '${' + (dim.lookmlName || lookmlIdentifier(dim.name)) + '}',
      dimensionId: dim.id,
      type: dim.type
    })), ...customMetrics.map(metric => ({
      label: 'measure: ' + (metric.lookmlName || lookmlIdentifier(metric.label)),
      insert: '{{' + (metric.lookmlName || lookmlIdentifier(metric.label)) + '}}',
      measureId: metric.id,
      type: 'number'
    }))];
    const templates = [...reportParameters.map(p => ({
      label: "PARAMETER('" + p.name + "') · " + p.label,
      insert: "PARAMETER('" + p.name + "')"
    })), {
      label: 'CASE WHEN condition THEN value ELSE value END',
      insert: "CASE WHEN ${user_records.state} = 'CA' THEN 'West' ELSE 'Other' END"
    }, {
      label: 'DATE(expression)',
      insert: 'DATE()'
    }, {
      label: 'TIMESTAMP(expression)',
      insert: 'TIMESTAMP()'
    }, {
      label: 'CURRENT_DATE()',
      insert: 'CURRENT_DATE()'
    }, {
      label: 'YEAR(date)',
      insert: 'YEAR()'
    }, {
      label: 'MONTH(date)',
      insert: 'MONTH()'
    }, {
      label: 'DAY(date)',
      insert: 'DAY()'
    }, {
      label: 'WEEK(date)',
      insert: 'WEEK()'
    }, {
      label: 'WEEKDAY(date)',
      insert: 'WEEKDAY()'
    }, {
      label: 'QUARTER(date)',
      insert: 'QUARTER()'
    }, {
      label: 'DATE_TRUNC(unit, date)',
      insert: "DATE_TRUNC('month', )"
    }, {
      label: 'DATEDIFF(start, end) · days',
      insert: 'DATEDIFF(, )'
    }, {
      label: 'DATEDIFF(unit, start, end)',
      insert: "DATEDIFF('day', , )"
    }, {
      label: 'DATE_ADD(date, interval)',
      insert: 'DATE_ADD(, 1)'
    }, {
      label: 'CONCAT(a, b)',
      insert: 'CONCAT(, )'
    }, {
      label: 'LOWER(value)',
      insert: 'LOWER()'
    }, {
      label: 'UPPER(value)',
      insert: 'UPPER()'
    }, {
      label: 'TRIM(value)',
      insert: 'TRIM()'
    }, {
      label: 'COALESCE(a, b)',
      insert: 'COALESCE(, )'
    }, {
      label: "PARAMETER('name') · sheet/module value",
      insert: "PARAMETER('')"
    }, {
      label: 'SAFE_DIVIDE(numerator, denominator)',
      insert: 'SAFE_DIVIDE(, )'
    }, {
      label: 'COUNT_IF(condition)',
      insert: 'COUNT_IF()'
    }, {
      label: 'REGEXP_EXTRACT(value, pattern, group)',
      insert: "REGEXP_EXTRACT(, '(.*)', 1)"
    }, {
      label: 'NULLIF(a, b)',
      insert: 'NULLIF(, )'
    }, {
      label: 'ABS(value)',
      insert: 'ABS()'
    }, {
      label: 'ROUND(value, places)',
      insert: 'ROUND(, 2)'
    }, {
      label: 'FLOOR(value)',
      insert: 'FLOOR()'
    }, {
      label: 'CEIL(value)',
      insert: 'CEIL()'
    }, {
      label: 'SUBSTR(value, start, length)',
      insert: 'SUBSTR(, 1)'
    }, {
      label: 'LENGTH(value)',
      insert: 'LENGTH()'
    }, {
      label: 'REPLACE(value, from, to)',
      insert: 'REPLACE(, , )'
    }, {
      label: 'MOD(a, b)',
      insert: 'MOD(, )'
    }, {
      label: 'POWER(a, b)',
      insert: 'POWER(, )'
    }, {
      label: 'GREATEST(a, b)',
      insert: 'GREATEST(, )'
    }, {
      label: 'LEAST(a, b)',
      insert: 'LEAST(, )'
    }, {
      label: 'HOUR(time)',
      insert: 'HOUR()'
    }, {
      label: 'MINUTE(time)',
      insert: 'MINUTE()'
    }, {
      label: 'SECOND(time)',
      insert: 'SECOND()'
    }, {
      label: 'Addition (+)',
      insert: ' + '
    }, {
      label: 'Subtraction (−)',
      insert: ' - '
    }, {
      label: 'Multiplication (×)',
      insert: ' * '
    }, {
      label: 'Division (÷)',
      insert: ' / '
    }, {
      label: 'Equals (=)',
      insert: ' = '
    }, {
      label: 'Not equal (<> )',
      insert: ' <> '
    }, {
      label: 'Greater than (>)',
      insert: ' > '
    }, {
      label: 'Less than (<)',
      insert: ' < '
    }, {
      label: 'Greater than or equal (>=)',
      insert: ' >= '
    }, {
      label: 'Less than or equal (<=)',
      insert: ' <= '
    }, {
      label: 'AND',
      insert: ' AND '
    }, {
      label: 'OR',
      insert: ' OR '
    }, {
      label: 'IN (value, value)',
      insert: ' IN ()'
    }, {
      label: 'NOT IN (value, value)',
      insert: ' NOT IN ()'
    }, {
      label: 'IS NULL',
      insert: ' IS NULL'
    }, {
      label: 'IS NOT NULL',
      insert: ' IS NOT NULL'
    }, {
      label: 'BETWEEN low AND high',
      insert: ' BETWEEN  AND '
    }, {
      label: 'NOT BETWEEN low AND high',
      insert: ' NOT BETWEEN  AND '
    }, {
      label: 'LIKE pattern',
      insert: " LIKE '%value%'"
    }, {
      label: 'NOT LIKE pattern',
      insert: " NOT LIKE '%value%'"
    }];
    if (/^\s*label\s*:/i.test(line)) {
      const id = before.match(/(?:dimension|measure)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\{[^}]*$/s)
        ?.[1] || 'Friendly Name',
        label = id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return [{
        label: 'Suggested label: ' + label,
        insert: quoteLookml(label)
      }, {
        label: 'Custom label…',
        insert: '"Friendly Name"'
      }]
    }
    if (/^\s*type\s*:/i.test(line)) {
      const headers = [...before.matchAll(
          /\b(dimension|measure)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/gi)],
        kind = headers.at(-1)?.[1]?.toLowerCase() || '',
        values = kind === 'measure' ? [
          ['sum', 'Sum values'],
          ['count', 'Count non-null values'],
          ['count_distinct', 'Count unique values'],
          ['avg', 'Average'],
          ['min', 'Minimum'],
          ['max', 'Maximum'],
          ['table_sum', 'Table total'],
          ['table_median', 'Table median'],
          ['table_mean', 'Table mean'],
          ['table_mode', 'Table mode'],
          ['table_avg', 'Table average'], ...['running_sum', 'running_difference_value',
            'running_difference_percent', 'previous_value', 'next_value'
          ].map(name => [name, 'Ordered report cells']),
          ['number', 'Numeric formula']
        ] : [
          ['string', 'String dimension'],
          ['date', 'Date dimension']
        ],
        token = (line.match(/[a-zA-Z_][a-zA-Z0-9_]*$/) || [])[0] || '';
      return values.filter(([value]) => !token || value.includes(token.toLowerCase())).map(([
        value, help
      ]) => ({
        label: value + ' · ' + help,
        insert: value
      }))
    }
    if (/^\s*date_part\s*:/i.test(line)) return ['year', 'month', 'week', 'weekday', 'day',
      'quarter'
    ].map(value => ({
      label: value,
      insert: value
    }));
    if (/^\s*percent_scale\s*:/i.test(line)) return ['fraction', 'points'].map(value => ({
      label: value,
      insert: value
    }));
    if (/^\s*table_mode\s*:/i.test(line)) return ['window', 'source'].map(value => ({
      label: value,
      insert: value
    }));
    if (/^\s*table_scope\s*:/i.test(line)) return ['visible', 'filtered'].map(value => ({
      label: value,
      insert: value
    }));
    if (/^\s*table_partition\s*:/i.test(line)) return customAttributes.filter(d => d.type !==
      'date').map(d => ({
      label: d.lookmlName,
      insert: d.lookmlName
    }));
    if (/^\s*table_order\s*:/i.test(line)) return customAttributes.flatMap(d => ['asc', 'desc']
      .map(direction => ({
        label: d.lookmlName + ' ' + direction,
        insert: d.lookmlName + ' ' + direction
      })));
    if (/^\s*fact_table\s*:/i.test(line)) return Object.keys(COLUMNS).map(value => ({
      label: value,
      insert: value
    }));
    if (/^\s*value_format\s*:/i.test(line)) return ['numeric', 'currency', 'percent'].map(value =>
      ({
        label: value,
        insert: value
      }));
    if (sqlContext || /^\s*sql\s*:/i.test(line)) {
      const sqlText = before.slice(Math.max(0, lastSql + 4)),
        metricPartial = sqlText.match(/\{\{([^}]*)$/),
        dimensionPartial = sqlText.match(/\$\{([^}]*)$/);
      if (metricPartial) return fields.filter(field => field.measureId && field.label
        .toLowerCase().includes(metricPartial[1].toLowerCase())).slice(0, 12);
      if (dimensionPartial) return fields.filter(field => !field.measureId && field.label
        .toLowerCase().includes(dimensionPartial[1].toLowerCase())).slice(0, 16);
      const token = (line.match(/[a-zA-Z_][a-zA-Z0-9_]*$/) || [])[0] || '';
      if (/^case$/i.test(token)) return templates.filter(item => item.label.startsWith('CASE'));
      if (/\bcase\b/i.test(sqlText)) return [];
      if (token) return templates.filter(item => item.label.toLowerCase().includes(token
        .toLowerCase())).slice(0, 20);
      return templates.concat(fields.slice(0, 12), fields.filter(field => field.dimensionId ||
        field.measureId)).slice(0, 40);
    }
    if (/(?:dimension|measure)\s*:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\{[\s\S]*$/i.test(before) && !
      /^\s*(label|type|value_format|date_part|sql|percent_scale|table_mode|table_scope|table_partition|table_order|fact_table)\s*:/i
      .test(line)) return [
      'label: "Friendly Name"', 'type: string', 'type: date', 'type: sum', 'type: count',
      'type: count_distinct', 'sql: ${user_records.state} ;;', 'value_format: numeric',
      'percent_scale: fraction', 'table_mode: window', 'table_scope: visible',
      'table_partition: all', 'table_order: date_name asc', 'fact_table: transaction_records'
    ].map(value => ({
      label: value,
      insert: value
    }));
    return [];
  }

  function renderCodeSuggestions(textarea) {
    const host = textarea?.parentElement?.querySelector('[data-code-suggestions]');
    if (!host) return;
    const items = codeDefinitionSuggestions(textarea),
      before = textarea.value.slice(0, textarea.selectionStart),
      sqlStart = before.toLowerCase().lastIndexOf('sql:'),
      sqlText = before.slice(sqlStart + 4),
      caseHint = sqlStart >= 0 && /\bcase\b/i.test(sqlText) ?
      '<small class="code-context-hint"><b>CASE pattern:</b> CASE WHEN condition THEN value ELSE value END · IN / NOT IN · IS NULL · BETWEEN · LIKE</small>' :
      '';
    if (!items.length && !caseHint) {
      host.hidden = true;
      host.innerHTML = '';
      return
    }
    host.innerHTML = caseHint + items.map((item, index) =>
      `<span class="code-suggestion-item"><button type="button" class="${index===0?'active':''}" data-code-suggestion data-code-insert="${htmlEscape(item.insert)}"><code>${htmlEscape(item.label)}</code></button>${item.table?`<button type="button" class="code-values-toggle" data-show-dimension-values data-table="${htmlEscape(item.table)}" data-column="${htmlEscape(item.column)}">Values ▾</button>`:item.dimensionId?`<button type="button" class="code-values-toggle" data-show-dimension-values data-dimension-id="${htmlEscape(item.dimensionId)}">Values ▾</button>`:''}</span>`
    ).join('');
    host.dataset.activeIndex = '-1';
    host.hidden = false
  }

  function insertCodeSuggestion(textarea, text) {
    const end = textarea.selectionStart,
      before = textarea.value.slice(0, end),
      partial = before.match(/\$\{[^}]*$/),
      token = partial || before.match(/[a-zA-Z_][a-zA-Z0-9_]*$/),
      start = token ? end - token[0].length : end;
    textarea.setRangeText(text, start, textarea.selectionEnd, 'end');
    textarea.focus();
    collectDefinitionSource();
    renderCodeSuggestions(textarea)
  }

  function handleCodeSuggestionKeydown(event) {
    const host = (activeDefinitionInput?.isConnected ? activeDefinitionInput : $(
        'definitionEditor')).parentElement.querySelector('[data-code-suggestions]'),
      buttons = [...host.querySelectorAll('[data-code-suggestion]')];
    if (host.hidden || !buttons.length) return;
    let index = Number(host.dataset.activeIndex) || 0;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      index = (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      host.dataset.activeIndex = String(index);
      buttons.forEach((button, i) => button.classList.toggle('active', i === index));
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      insertCodeSuggestion(activeDefinitionInput?.isConnected ? activeDefinitionInput : $(
        'definitionEditor'), buttons[index]?.dataset.codeInsert || '');
      return
    }
    if (event.key === 'Escape') host.hidden = true
  }

  function insertCodeText(textarea, text) {
    if (!textarea) return;
    const start = textarea.selectionStart,
      end = textarea.selectionEnd,
      value = textarea.value;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    textarea.focus();
    const cursor = start + text.length;
    textarea.setSelectionRange(cursor, cursor);
    collectDefinitionSource()
  }

  function handleDictionaryAction(event) {
    const valueToggle = event.target.closest('[data-show-dimension-values]');
    if (valueToggle) {
      const host = (activeDefinitionInput?.isConnected ? activeDefinitionInput : $(
          'definitionEditor')).parentElement.querySelector('[data-code-suggestions]'),
        table = valueToggle.dataset.table,
        column = valueToggle.dataset.column,
        dimensionId = valueToggle.dataset.dimensionId,
        dim = customAttributes.find(item => item.id === dimensionId),
        dimensionKey = dimensionId || table + '.' + column,
        dimensionName = dim ? dimensionLabel(dimensionId) : table + '.' + column,
        previous = host.querySelector('[data-dimension-values]');
      if (previous?.dataset.dimensionField === dimensionKey) {
        previous.remove();
        return
      }
      previous?.remove();
      const values = dim ? filterDimensionValues(dimensionId) : availableColumnValues(table,
          column),
        panel = document.createElement('div');
      panel.className = 'dimension-values-panel';
      panel.dataset.dimensionValues = '';
      panel.dataset.dimensionField = dimensionKey;
      panel.innerHTML =
        `<strong>Values in ${htmlEscape(dimensionName)}</strong>${values.length?values.map(value=>{const sql="'"+String(value).replace(/'/g,"''").replace(/\\/g,'\\\\')+"'";return`<button type="button" data-dimension-value data-value-insert="${htmlEscape(sql)}">${htmlEscape(value)}</button>`}).join(''):'<small>Generate data to populate sample values for this dimension.</small>'}`;
      host.prepend(panel);
      return
    }
    const dimensionValue = event.target.closest('[data-dimension-value]');
    if (dimensionValue) {
      insertCodeText(activeDefinitionInput?.isConnected ? activeDefinitionInput : $(
        'definitionEditor'), dimensionValue.dataset.valueInsert || '');
      return
    }
    const suggestion = event.target.closest('[data-code-suggestion]');
    if (suggestion) insertCodeSuggestion(activeDefinitionInput?.isConnected ?
      activeDefinitionInput : $('definitionEditor'), suggestion.dataset.codeInsert ||
      '');
  }
  // Data Dictionary saving and sample evaluation
  async function saveLookmlDefinitions() {
    const editor = $('definitionEditor'),
      status = $('definitionStatus');
    const initialDimensions = customAttributes,
      initialMeasures = customMetrics,
      initialParameters = reportParameters;
    collectDefinitionSource();
    try {
      const beforeDimensions = customAttributes.slice(),
        beforeMeasures = customMetrics.slice(),
        result = resolveLookmlDefinitions(editor.value);
      validateStoredParameterOverrides();
      for (const item of result.dimensions) {
        const old = beforeDimensions.find(x => x.id === item.id);
        addDefinitionHistory('dimension', item.name, old ? 'Updated' : 'Created')
      }
      for (const item of beforeDimensions)
        if (!result.dimensions.some(x => x.id === item.id)) addDefinitionHistory('dimension',
          item.name, 'Removed');
      for (const item of result.measures) {
        const old = beforeMeasures.find(x => x.id === item.id);
        addDefinitionHistory('measure', item.label, old ? 'Updated' : 'Created')
      }
      for (const item of beforeMeasures)
        if (!result.measures.some(x => x.id === item.id)) addDefinitionHistory('measure', item
          .label, 'Removed');
      editor.value = stampDefinitionContracts(editor.value, result.measures);
      persistDictionaryDraft(editor.value);
      rememberDefinitionVersion(editor.value);
      customAttributes = result.dimensions;
      customMetrics = result.measures;
      invalidateReportsForDictionaryChange();
      persistDefinitionHistory();
      renderDictionary();
      renderSheet();
      status.textContent =
        `Saved ${customAttributes.length} dimensions (${customAttributes.filter(a=>a.type==='date').length} dates) and ${customMetrics.length} measures.`;
      status.classList.remove('error');
      try {
        await saveDictionarySidecar(editor.value);
        status.textContent += ' Project file updated.'
      } catch (fileError) {
        if (fileError?.name === 'AbortError') {
          status.textContent +=
            ' Browser-local save kept; project file selection was cancelled.';
          return
        }
        throw fileError
      }
    } catch (error) {
      if (customAttributes === initialDimensions && customMetrics === initialMeasures)
        reportParameters = initialParameters;
      status.textContent = 'Definition error: ' + error.message;
      status.classList.add('error')
    }
  }

  function evaluationSourceTable(kind, item) {
    if (kind === 'measure' && item.factTable) return item.factTable;
    const refs = kind === 'dimension' ? dimensionFieldRefs(item.id) : metricFieldRefs(item.id);
    return refs.length ? refs[0].split('.')[0] : 'user_records'
  }

  function evaluationGrain(table) {
    return ({
      user_records: 'one row per user',
      subscription_records: 'one row per subscription',
      transaction_records: 'one row per transaction',
      scheduled_subscription_payment_records: 'one row per scheduled payment',
      subscription_change_records: 'one row per subscription change',
      failed_transactions: 'one row per failed attempt',
      marketing_records: 'one row per campaign-day'
    })[table] || 'one row per source record'
  }

  function evaluationRowMap(primaryTable, row, sourceTables) {
    const rowMap = {
        [primaryTable]: row
      },
      rowsFor = name => tables?.[name]?.preview || [];
    for (const name of sourceTables) {
      if (name === primaryTable) continue;
      const candidates = rowsFor(name);
      let match = null;
      if (primaryTable === 'transaction_records' && name ===
        'scheduled_subscription_payment_records') match = candidates.find(candidate => String(
        candidate.scheduled_payment_id) === String(row.schedule_id));
      else if (primaryTable === 'scheduled_subscription_payment_records' && name ===
        'transaction_records') match = candidates.find(candidate => String(candidate
        .schedule_id) === String(row.scheduled_payment_id));
      else if (primaryTable === 'marketing_records' && name === 'user_records') match = candidates
        .find(candidate => String(candidate.campaign_source) === String(row.campaign_source) &&
          String(candidate.campaign_name) === String(row.campaign_name));
      else if (primaryTable === 'user_records' && name === 'marketing_records') match = candidates
        .find(candidate => String(candidate.campaign_source) === String(row.campaign_source) &&
          String(candidate.campaign_name) === String(row.campaign_name));
      if (!match) {
        const keys = ['scheduled_payment_id', 'transaction_id', 'subscription_id', 'user_id'];
        for (const key of keys) {
          if (row[key] == null) continue;
          match = candidates.find(candidate => candidate[key] != null && String(candidate[
            key]) === String(row[key]));
          if (match) break
        }
      }
      if (match) rowMap[name] = match
    }
    return rowMap
  }

  function stableEvaluationSample(rows, count) {
    if (rows.length <= count) return rows.slice();
    if (count <= 1) return [rows[0]];
    return Array.from({
      length: count
    }, (_, index) => rows[Math.round(index * (rows.length - 1) / (count - 1))])
  }

  function evaluationDisplayValue(value) {
    if (value == null) return 'NULL';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : new Intl
      .NumberFormat(undefined, {
        maximumFractionDigits: 4
      }).format(value);
    return String(value)
  }

  function evaluationErrorLine(error, parsedInput, source) {
    const message = String(error?.message || error),
      nameMatch = message.match(/(?:dimension|measure|date)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i),
      refMatch = message.match(/\[([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\]/),
      block = (nameMatch && parsedInput.find(item => item.id.toLowerCase() === nameMatch[1]
        .toLowerCase())) || (refMatch && parsedInput.find(item => item.sql.includes('[' +
        refMatch[1] + ']')));
    if (block) {
      const line = source.slice(0, block.start).split(/\r?\n/).length;
      return `Line ${line} · ${block.kind} ${block.id}: ${message}`
    }
    return message
  }

  function sampleAggregateValue(aggregation, entries) {
    const present = entries.map(entry => entry.value).filter(value => value != null && value !==
      '');
    if (aggregation === 'count') return present.length;
    if (aggregation === 'count_distinct') return new Set(present.map(String)).size;
    const numbers = present.map(Number).filter(Number.isFinite);
    if (!numbers.length) return null;
    if (['avg', 'table_avg', 'table_mean'].includes(aggregation)) return numbers.reduce((sum,
      value) => sum + value, 0) / numbers.length;
    if (aggregation === 'min') return Math.min(...numbers);
    if (aggregation === 'max') return Math.max(...numbers);
    if (aggregation === 'table_median') {
      const sorted = [...numbers].sort((a, b) => a - b),
        middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
    }
    if (aggregation === 'table_mode') {
      const frequencies = new Map();
      for (const value of numbers) frequencies.set(value, (frequencies.get(value) || 0) + 1);
      const maximum = Math.max(...frequencies.values());
      return [...frequencies].filter(([, count]) => count === maximum).map(([value]) => value)
        .sort((a, b) => a - b)[0]
    }
    return numbers.reduce((sum, value) => sum + value, 0)
  }

  function evaluateDictionaryPreview() {
    const editor = $('evaluationCode'),
      results = $('evaluationResults'),
      status = $('evaluationStatus'),
      sourceSummary = $('evaluationSourceSummary');
    if (!editor || !results || !status) return;
    const source = editor.value.trim();
    if (!tables || !appState) {
      status.textContent = 'Generate data before evaluating a sample.';
      status.className = 'evaluation-status error';
      results.innerHTML =
        '<div class="evaluation-no-data">No generated dataset is available yet.</div>';
      return
    }
    if (!source) {
      status.textContent = 'Paste one or more dimension, date, or measure definitions.';
      status.className = 'evaluation-status error';
      results.innerHTML =
        '<div class="evaluation-empty">Paste LookML-style definitions, then evaluate them.</div>';
      return
    }
    const priorDimensions = customAttributes,
      priorMeasures = customMetrics,
      priorParameters = reportParameters;
    let parsedInput = [];
    try {
      parsedInput = parseLookmlDefinitions(source);
      const inputNames = new Set(parsedInput.map(block =>
          `${block.kind}:${block.id.toLowerCase()}`)),
        savedBlocks = parseLookmlDefinitions(serializeLookmlDefinitions()),
        baseSource = savedBlocks.filter(block => !inputNames.has(
          `${block.kind}:${block.id.toLowerCase()}`)).map(block => block.raw).join('\n\n'),
        parameterBlocks = splitDefinitionCards(serializeLookmlDefinitions()).filter(s => s
          .kind === 'parameter').map(s => s.raw).join('\n\n'),
        combined = [parameterBlocks, baseSource, source].filter(Boolean).join('\n\n'),
        resolved = resolveLookmlDefinitions(combined),
        parsedCombined = parseLookmlDefinitions(combined);
      customAttributes = resolved.dimensions;
      customMetrics = resolved.measures;
      const definitions = parsedCombined.filter(block => inputNames.has(
          `${block.kind}:${block.id.toLowerCase()}`)),
        requested = Math.max(1, Math.min(25, Number($('evaluationSampleCount')?.value) || 5)),
        rendered = [],
        sourceTablesUsed = new Set();
      for (const block of definitions) {
        const kind = block.kind === 'measure' ? 'measure' : block.props.type.trim()
          .toLowerCase() === 'date' ? 'date' : 'dimension',
          item = kind === 'measure' ? customMetrics.find(value => value.lookmlName === block.id) :
          customAttributes.find(value => value.lookmlName === block.id);
        if (!item) {
          rendered.push(
            `<article class="evaluation-result-definition"><div class="evaluation-result-title"><b>${htmlEscape(block.id)}</b><small>${htmlEscape(kind)}</small></div><div class="evaluation-error">Could not resolve this definition.</div></article>`
          );
          continue
        }
        if (item.tableMode === 'window') {
          rendered.push('<article class="evaluation-result-definition"><b>' + htmlEscape(item
              .lookmlName) +
            '</b><p>Table-window result depends on report categories, partition, and visible/filtered scope. Save this definition and evaluate it in a report; a row sample has no table window.</p></article>'
          );
          continue
        }
        const table = evaluationSourceTable(kind === 'date' ? 'dimension' : kind, item),
          grain = evaluationGrain(table);
        sourceTablesUsed.add(table);
        const refs = kind === 'measure' ? metricFieldRefs(item.id) : dimensionFieldRefs(item.id),
          sourceTables = [...new Set(refs.map(ref => ref.split('.')[0]))],
          rows = tables?.[table]?.preview || [],
          sample = kind === 'measure' ? stableEvaluationSample(rows, requested) : rows,
          values = [],
          errors = [];
        for (let index = 0; index < sample.length; index++) {
          const row = sample[index],
            rowMap = evaluationRowMap(table, row, sourceTables),
            caseTrace = [];
          try {
            const value = kind === 'measure' ? (item.kind === 'ratio' ? metricRowValue(item,
              rowMap, [], [], caseTrace) : evaluateFormula(item.formula || `[${item.source}]`,
              rowMap, [item.id], caseTrace)) : dimensionValue(item.id, rowMap.user_records,
              rowMap.subscription_records?.subscription_length, rowMap.transaction_records
              ?.transaction_ts || rowMap.scheduled_subscription_payment_records
              ?.scheduled_payment_ts, rowMap, [], caseTrace);
            values.push({
              value,
              caseTrace,
              key: row.user_id ?? row.subscription_id ?? row.transaction_id ?? row
                .scheduled_payment_id ?? row.marketing_record_id ?? index + 1
            })
          } catch (error) {
            errors.push({
              index,
              error: error.message || String(error)
            })
          }
        }
        const aggregation = item.aggregation || 'sum',
          numericValues = values.map(entry => Number(entry.value)).filter(Number.isFinite);
        let aggregate = kind === 'measure' ? sampleAggregateValue(aggregation, values) : null;
        if (kind === 'measure' && item.kind === 'ratio') {
          const aggregateSampleMetric = metric => {
              if (!metric) return null;
              const rowValues = sample.map(row => {
                const rowMap = evaluationRowMap(table, row, sourceTables);
                return metric.kind === 'column' ? rawField(metric.source, rowMap) :
                  metricRowValue(metric, rowMap, [], [], null)
              }).filter(value => value != null && value !== '');
              return sampleAggregateValue(metric.aggregation || 'sum', rowValues.map(value => ({
                value
              })))
            },
            numerator = customMetrics.find(metric => metric.id === item.numerator),
            denominator = customMetrics.find(metric => metric.id === item.denominator),
            numeratorTotal = aggregateSampleMetric(numerator),
            denominatorTotal = aggregateSampleMetric(denominator);
          aggregate = ReportingTools.divide(numeratorTotal, denominatorTotal);
          if (aggregate != null && item.asPercent && item.percentScale !== 'fraction')
            aggregate *= 100
        }
        const line = source.slice(0, parsedInput.find(candidate => candidate.id === block.id &&
          candidate.kind === block.kind)?.start || 0).split(/\r?\n/).length;
        const distinctDimensionValues = kind === 'measure' ? [] : [...new Map(values.map(
            entry => [JSON.stringify([entry.value === null ? 'null' : typeof entry.value,
              entry.value
            ]), entry])).values()].sort((a, b) => String(a.value ?? '').localeCompare(String(b
            .value ?? ''), undefined, {
            numeric: true
          })),
          displayValues = kind === 'measure' ? values : distinctDimensionValues,
          showCaseTrace = kind === 'measure' && values.some(entry => entry.caseTrace?.length),
          rowsHtml = displayValues.map(entry =>
            `<tr>${kind==='measure'?`<td>${htmlEscape(String(entry.key))}</td><td>${htmlEscape(evaluationDisplayValue(entry.value))}</td>`:`<td>${htmlEscape(evaluationDisplayValue(entry.value))}</td>`}${showCaseTrace?`<td>${htmlEscape(entry.caseTrace?.join(' → ' )||'—')}</td>`:''}</tr>`
          ).join(''),
          errorHtml = errors.map(entry =>
            `<div class="evaluation-error">Line ${line} · ${htmlEscape(block.kind)} ${htmlEscape(block.id)} · Sample row ${entry.index+1}: ${htmlEscape(entry.error)}</div>`
          ).join(''),
          tfoot = kind === 'measure' ?
          `<tfoot><tr><td${showCaseTrace?' colspan="2"':''}>Sample ${htmlEscape(aggregation)} (${values.length} rows)</td><td>${htmlEscape(aggregate==null?'—':evaluationDisplayValue(aggregate))}</td></tr></tfoot>` :
          '';
        rendered.push(
          `<article class="evaluation-result-definition"><div class="evaluation-result-title"><b>${htmlEscape(item.lookmlName||item.name||item.label)}</b><small>${htmlEscape(kind==='measure'?`${aggregation} · ${item.format||'number'}`:kind)}</small></div><div class="evaluation-source">Line ${line} · ${htmlEscape(table)} · ${htmlEscape(grain)} · ${kind==='measure'?`${values.length}/${requested} sample rows`:`${distinctDimensionValues.length} distinct values · ${values.length} available preview records evaluated`}</div><table class="evaluation-result-table"><thead><tr>${kind==='measure'?'<th>Sample record</th><th>Row value</th>':'<th>Distinct dimension value</th>'}${showCaseTrace?'<th>CASE branch</th>':''}</tr></thead><tbody>${rowsHtml||`<tr><td colspan="${kind==='measure'?2:1}">No ${kind==='measure'?'sample rows':'dimension values'} available</td></tr>`}</tbody>${tfoot}</table>${errorHtml}</article>`
        )
      }
      if (sourceSummary) sourceSummary.textContent = sourceTablesUsed.size ? [...sourceTablesUsed]
        .map(table => `${table} · ${evaluationGrain(table)}`).join('  |  ') :
        'No source columns referenced';
      results.innerHTML = rendered.join('') ||
        '<div class="evaluation-empty">No definitions were found in the pasted block.</div>';
      status.textContent =
        `Evaluated ${definitions.length} definition${definitions.length===1?'':'s'} using all available preview records for dimensions/dates and ${requested} repeatable sample rows for measures. Full datasets are not scanned by this preview.`;
      status.className = 'evaluation-status success'
    } catch (error) {
      results.innerHTML =
        `<div class="evaluation-error">${htmlEscape(evaluationErrorLine(error,parsedInput,source))}</div>`;
      status.textContent =
        'Evaluation failed. Correct the reported definition and evaluate again.';
      status.className = 'evaluation-status error';
      if (sourceSummary) sourceSummary.textContent =
        'Unable to resolve the source table and row grain'
    } finally {
      customAttributes = priorDimensions;
      customMetrics = priorMeasures;
      reportParameters = priorParameters;
    }
  }

  function renderDictionary() {
    renderReportingKnowledge();
    const editor = $('definitionEditor');
    if (editor && editor.dataset.initialized !== 'true') {
      editor.value = serializeLookmlDefinitions();
      editor.dataset.initialized = 'true'
    }
    renderDefinitionTables();
    const schema = $('definitionSchema');
    if (schema) schema.innerHTML = '';
    if ($('relationshipList')) $('relationshipList').innerHTML = RELATIONSHIPS.map(([a, b]) =>
        '<span class="relationship-pill">' + htmlEscape(a) + ' ↔ ' + htmlEscape(b) + '</span>')
      .join('');
    if ($('definitionHistory')) $('definitionHistory').innerHTML = definitionHistory.length ?
      definitionHistory.map(h => '<div class="history-item"><b>' + htmlEscape(h.action) + ' ' +
        htmlEscape(h.kind) + ':</b> ' + htmlEscape(h.label) + ' <time>' + new Date(h.ts)
        .toLocaleString() + '</time></div>').join('') : 'No definition changes yet.';
    renderReportFieldPalette()
  }

  function setReportView(view) {
    const views = {
      generator: 'generatorView',
      dictionary: 'dictionaryView',
      reporting: 'reportingView'
    };
    for (const [key, id] of Object.entries(views)) $(id).hidden = key !== view;
    for (const [key, id] of Object.entries({
        generator: 'generatorTab',
        dictionary: 'dictionaryTab',
        reporting: 'reportingTab'
      })) $(id).classList.toggle('active', key === view);
    document.body.classList.toggle('reporting-active', view === 'reporting');
    document.body.classList.toggle('dictionary-active', view === 'dictionary');
    if (view !== 'reporting') selectReportModule(null);
    if (view !== 'dictionary') document.body.classList.remove('definition-editor-open');
    updateReportSidebarPin(view !== 'reporting');
    if (view === 'dictionary') renderDictionary();
    if (view === 'reporting') {
      renderSheet();
      requestAnimationFrame(() => updateReportSidebarPin(true))
    }
  }

  function initializeReporting() {
    loadReporting();
    installReportCanvasFormats();
    if (!reportSheets.some(s => s.id === activeSheetId)) activeSheetId = reportSheets[0].id;
    renderDictionary();
    renderSheet();
    requestAnimationFrame(() => updateReportSidebarPin(true))
  }

  function updateExportSelection() {
    const boxes = [...document.querySelectorAll('#exportOptions input')],
      selected = boxes.filter(b => b.checked),
      n = selected.length,
      rows = selected.reduce((sum, b) => sum + (tables?.[b.value]?.count || 0), 0);
    $('selectedTableCount').textContent = `${n} selected · ${rows.toLocaleString()} rows`;
    $('downloadCsv').disabled = !tables || !n
  }

  function downloadTableCsv(key) {
    const meta = tables[key],
      chunks = meta.parts.length ? [meta.parts[0], ...meta.parts.slice(1).map(x => '\r\n' + x)] :
      [COLUMNS[key].join(',')];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(chunks, {
      type: 'text/csv;charset=utf-8'
    }));
    a.download = key + '.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  function safeExportName(name) {
    return String(name || 'report').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') ||
      'report'
  }

  function isExportSecurityError(error) {
    return error?.name === 'SecurityError' || /operation is insecure|secure context|insecure/i
      .test(error?.message || '')
  }
  async function chooseExportDestination(filename, mime, extension) {
    try {
      if (window.showDirectoryPicker) return {
        kind: 'directory',
        handle: await window.showDirectoryPicker({
          mode: 'readwrite'
        })
      };
      if (window.showSaveFilePicker) return {
        kind: 'file',
        handle: await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: `${extension.slice(1).toUpperCase()} file`,
            accept: {
              [mime]: [extension]
            }
          }]
        })
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      if (!isExportSecurityError(error)) throw error;
      return {
        kind: 'download',
        fallback: true
      }
    }
    return {
      kind: 'download'
    }
  }

  function downloadExportBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000)
  }
  async function saveExportBlob(blob, filename, destination) {
    try {
      if (destination?.kind === 'directory') {
        const file = await destination.handle.getFileHandle(filename, {
            create: true
          }),
          writer = await file.createWritable();
        await writer.write(blob);
        await writer.close();
        toast(`Saved ${filename} in the selected folder.`);
        return
      }
      if (destination?.kind === 'file') {
        const writer = await destination.handle.createWritable();
        await writer.write(blob);
        await writer.close();
        toast(`Saved ${filename}.`);
        return
      }
    } catch (error) {
      if (!isExportSecurityError(error)) throw error;
      destination = {
        kind: 'download',
        fallback: true
      }
    }
    downloadExportBlob(blob, filename);
    if (destination?.fallback) toast(
      'The local launcher blocked folder access. The export was sent to your browser downloads instead.'
    )
  }

  async function exportWidgetCsv(widget) {
    if (widget.config?.chartType !== 'spreadsheet') {
      toast('CSV export is only available for Spreadsheet modules.');
      return
    }
    const rows = widget.lastSpreadsheetCsvRows || [];
    if (!rows.length) {
      toast('Refresh this Spreadsheet module before exporting it.');
      return
    }
    const filename = `${safeExportName(widget.name)}.csv`,
      csv = rows.map(row => row.map(value => csvEscape(value)).join(',')).join('\r\n');
    try {
      const destination = await chooseExportDestination(filename, 'text/csv', '.csv');
      await saveExportBlob(new Blob([csv], {
        type: 'text/csv;charset=utf-8'
      }), filename, destination)
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        toast(error.message || 'Module CSV export failed.')
      }
    }
  }

  // Report workspace controls. Configuration is saved with each sheet; source data is never changed.
  const reportUndo = [],
    reportRedo = [],
    selectedModules = new Set();
  let historySnapshot = null,
    restoringReportHistory = false;
  let reportParameters = [];

  function reportConfigSnapshot() {
    return JSON.stringify({
      activeSheetId,
      sheets: reportSheets.map(sheet => ({
        ...sheet,
        widgets: sheet.widgets.map(widget => Object.fromEntries(Object.entries(widget)
          .filter(([key]) => !key.startsWith('last') && !['needsRefresh'].includes(
            key))))
      }))
    });
  }

  function captureReportHistory() {
    const next = reportConfigSnapshot();
    if (!restoringReportHistory && historySnapshot && historySnapshot !== next) {
      reportUndo.push(historySnapshot);
      if (reportUndo.length > 30) reportUndo.shift();
      reportRedo.length = 0;
    }
    historySnapshot = next;
    if ($('reportUndo')) $('reportUndo').disabled = !reportUndo.length;
    if ($('reportRedo')) $('reportRedo').disabled = !reportRedo.length;
  }

  function travelReportHistory(direction) {
    const from = direction === 'undo' ? reportUndo : reportRedo,
      to = direction === 'undo' ? reportRedo : reportUndo;
    if (!from.length) {
      toast('No more changes to ' + direction + '.');
      return;
    }
    to.push(reportConfigSnapshot());
    const saved = JSON.parse(from.pop());
    restoringReportHistory = true;
    reportSheets = saved.sheets;
    activeSheetId = saved.activeSheetId;
    for (const sheet of reportSheets)
      for (const widget of sheet.widgets) {
        widget.needsRefresh = widget.kind !== 'placeholder';
        reportDisplaySnapshots.delete(widget.id);
      }
    historySnapshot = reportConfigSnapshot();
    persistReporting();
    renderSheet();
    restoringReportHistory = false;
  }

  const REPORT_CANVAS_FORMATS = [
    ['canvas', 'Current Canvas', null, null],
    ['a4_portrait', 'A4 Portrait', 794, 1123],
    ['a4_landscape', 'A4 Landscape', 1123, 794],
    ['letter_portrait', 'Letter Portrait', 816, 1056],
    ['letter_landscape', 'Letter Landscape', 1056, 816],
    ['legal_portrait', 'Legal Portrait', 816, 1344],
    ['legal_landscape', 'Legal Landscape', 1344, 816],
    ['a3_portrait', 'A3 Portrait', 1123, 1587],
    ['a3_landscape', 'A3 Landscape', 1587, 1123],
    ['magazine', 'Magazine Portrait', 816, 1056],
    ['magazine_landscape', 'Magazine Landscape', 1056, 816],
    ['wide', 'Widescreen 16:9', 1280, 720],
    ['standard', 'Standard 4:3', 1024, 768],
    ['square', 'Square', 1080, 1080]
  ];

  function installReportCanvasFormats() {
    const select = document.createElement('select');
    select.id = 'reportCanvasFormat';
    select.className = 'secondary';
    select.setAttribute('aria-label', 'Reporting canvas format');
    select.innerHTML = REPORT_CANVAS_FORMATS.map(([id, label]) =>
      `<option value="${id}">${label}</option>`).join('');
    $('saveInstance').before(select);
    select.onchange = () => {
      activeSheet().canvasFormat = select.value;
      applyReportCanvasFormat();
      persistReporting();
    };
  }

  function applyReportCanvasFormat() {
    const sheet = activeSheet(),
      format = REPORT_CANVAS_FORMATS.find(f => f[0] === sheet.canvasFormat) ||
      REPORT_CANVAS_FORMATS[0],
      inner = $('reportCanvasInner');
    if ($('reportCanvasFormat')) $('reportCanvasFormat').value = format[0];
    let boundary = $('reportPageBoundary');
    if (!boundary) {
      boundary = document.createElement('div');
      boundary.id = 'reportPageBoundary';
      boundary.setAttribute('aria-hidden', 'true');
      inner.append(boundary);
    }
    boundary.hidden = !format[2];
    boundary.style.width = (format[2] || 0) + 'px';
    boundary.style.height = (format[3] || 0) + 'px';
    inner.style.width = Math.max(REPORT_GRID.columns * (REPORT_GRID.cellWidth + REPORT_GRID.gap) -
      REPORT_GRID.gap + 24, (format[2] || 0) + 24) + 'px';
    // Preserve the grid's cell sizes when the selected page is wider than the normal canvas.
    $('reportCharts').style.width = (REPORT_GRID.columns * (REPORT_GRID.cellWidth + REPORT_GRID
      .gap) - REPORT_GRID.gap) + 'px';
    inner.style.minHeight = format[3] ? format[3] + 'px' : '';
    for (const widget of sheet.widgets) {
      const outside = !!format[2] && ((widget.gridColumn - 1 + widget.colSpan) * (REPORT_GRID
        .cellWidth + REPORT_GRID.gap) - REPORT_GRID.gap > format[2] || (widget.gridRow - 1 +
        widget.rowSpan) * 20 > format[3]);
      const el = widgetElement(widget.id);
      if (el) {
        el.classList.toggle('outside-page', outside);
        el.dataset.pageWarning = outside ? 'Outside selected page' : '';
      }
    }
  }

  function applyCanvasView() {
    const sheet = activeSheet(),
      inner = $('reportCanvasInner'),
      frame = $('reportCanvasScroll');
    if (!inner || !frame) return;
    // Preserve the original sixteen-column canvas cell width across twelve columns.
    inner.style.width = (REPORT_GRID.columns * (REPORT_GRID.cellWidth + REPORT_GRID.gap) -
      REPORT_GRID.gap + 24) + 'px';
    inner.style.minWidth = '0';
    inner.style.zoom = '1';
    inner.style.setProperty('--report-canvas-rows', sheet.canvasRows);
    $('reportCharts').style.minHeight = sheet.canvasRows * 20 + 'px';
    sheet.layoutLocked = false;
    if ($('reportLock')) $('reportLock').hidden = true;
    document.body.classList.remove('report-layout-locked');
    applyReportCanvasFormat();
    if ($('reportGridInfo')) $('reportGridInfo').textContent =
      `12 columns × ${sheet.canvasRows} rows · Scroll down to extend the canvas`;
    positionSelectedModuleToolbar();
  }

  function alignSelectedModules(action) {
    const widgets = activeSheet().widgets.filter(w => selectedModules.has(w.id));
    if (widgets.length < 2) {
      toast('Select at least two modules using their checkboxes.');
      return;
    }
    const proposed = JSON.parse(JSON.stringify(widgets));
    if (action === 'size')
      for (const w of proposed) {
        w.colSpan = widgets[0].colSpan;
        w.rowSpan = widgets[0].rowSpan;
      }
    if (action === 'left')
      for (const w of proposed) w.gridColumn = Math.min(...widgets.map(w => w.gridColumn));
    if (action === 'top')
      for (const w of proposed) w.gridRow = Math.min(...widgets.map(w => w.gridRow));
    if (action === 'vertical' || action === 'horizontal') {
      const key = action === 'vertical' ? 'gridRow' : 'gridColumn',
        span = action === 'vertical' ? 'rowSpan' : 'colSpan';
      proposed.sort((a, b) => a[key] - b[key]);
      const total = proposed.reduce((n, w) => n + w[span], 0),
        start = proposed[0][key],
        end = Math.max(...proposed.map(w => w[key] + w[span])),
        gap = Math.max(0, Math.floor((end - start - total) / (proposed.length - 1)));
      let at = start;
      for (const w of proposed) {
        w[key] = at;
        at += w[span] + gap;
      }
    }
    const all = activeSheet().widgets.map(w => proposed.find(p => p.id === w.id) || w);
    if (proposed.some(w => !canPlaceReportWidget(w, all))) {
      toast('This alignment would overlap modules or exceed the canvas. Move them apart first.');
      return;
    }
    for (const w of widgets) Object.assign(w, proposed.find(p => p.id === w.id));
    persistReporting();
    renderSheet();
  }

  function parameterValue(definition, values = {}) {
    let value = Object.hasOwn(values, definition.name) ? values[definition.name] : definition
      .default;
    if (definition.type === 'number') {
      value = Number(value);
      if (!Number.isFinite(value)) throw Error('Parameter ' + definition.name +
        ' requires a number.');
      if (definition.min != null && value < definition.min || definition.max != null && value >
        definition.max) throw Error('Parameter ' + definition.name + ' is outside its bounds.');
    } else if (definition.type === 'boolean') value = value === true || value === 'true';
    else value = String(value ?? '');
    if (definition.allowed_values?.length && !definition.allowed_values.map(String).includes(
        String(value))) throw Error('Parameter ' + definition.name + ' is not an allowed value.');
    return value;
  }

  function parseParameterDefinitions(source) {
    const parameters = [],
      text = source.replace(/^\s*parameter\s*:\s*([A-Za-z_]\w*)\s*\{([^{}]*)\}/gm, (_, name,
        body) => {
        if (parameters.some(p => p.name === name)) throw Error('Duplicate parameter: ' + name);
        const props = {};
        for (const line of body.split('\n').map(x => x.trim()).filter(x => x && !x.startsWith(
            '#'))) {
          const match = line.match(
            /^(type|default|label|min|max|allowed_values)\s*:\s*(.*?)\s*$/);
          if (!match) throw Error('Unsupported parameter property: ' + line);
          props[match[1]] = match[2];
        }
        const unquote = value => String(value ?? '').replace(/^["']|["']$/g, '');
        if (props.type === 'boolean' && !['true', 'false'].includes(String(props.default)))
          throw Error('Boolean parameter defaults must be true or false.');
        const p = {
          name,
          type: props.type || 'number',
          label: unquote(props.label || name),
          default: unquote(props.default ?? 0)
        };
        if (!['number', 'string', 'boolean'].includes(p.type)) throw Error(
          'Parameter type must be number, string, or boolean.');
        if (props.min != null) p.min = Number(props.min);
        if (props.max != null) p.max = Number(props.max);
        if ((p.min != null && !Number.isFinite(p.min)) || (p.max != null && !Number.isFinite(p
            .max)) || (p.min != null && p.max != null && p.min > p.max)) throw Error(
          'Invalid bounds for parameter ' + name);
        if (props.allowed_values) {
          try {
            p.allowed_values = JSON.parse(props.allowed_values);
          } catch {
            throw Error('allowed_values must be a JSON array.');
          }
          if (!Array.isArray(p.allowed_values)) throw Error('allowed_values must be an array.');
        }
        p.default = parameterValue(p);
        parameters.push(p);
        return '';
      });
    return {
      parameters,
      text
    };
  }

  function parameterInputs(values = {}, scope = 'sheet', definitions = reportParameters) {
    return definitions.map(p => {
      const value = parameterValue(p, values),
        attribute =
        `data-report-parameter="${htmlEscape(p.name)}" data-parameter-scope="${scope}"`;
      const input = p.allowed_values?.length ?
        `<select ${attribute}>${p.allowed_values.map(v=>`<option value="${htmlEscape(v)}"${String(v)===String(value)?' selected':''}>${htmlEscape(v)}</option>`).join('')}</select>` :
        p.type === 'boolean' ?
        `<select ${attribute}><option value="true"${value?' selected':''}>True</option><option value="false"${!value?' selected':''}>False</option></select>` :
        `<input ${attribute} type="${p.type==='number'?'number':'text'}" step="any" ${p.min!=null?`min="${p.min}"`:''} ${p.max!=null?`max="${p.max}"`:''} value="${htmlEscape(value)}">`;
      return `<label class="report-control">${htmlEscape(p.label)}${input}</label>`;
    }).join('');
  }

  function reportAnalysisControls(widget) {
    const c = widget.config,
      options = (items, current) => items.map(([v, label]) =>
        `<option value="${v}"${String(current||'none')===v?' selected':''}>${label}</option>`)
      .join('');
    return `<details class="module-config-section module-config-accordion" data-analysis-controls><summary>Analysis & Parameters</summary><div class="widget-config"><label class="report-control">Metric selector<select data-analysis-setting="selectedMetric"><option value="">Use axis measures</option>${customMetrics.map(m=>`<option value="${m.id}"${c.selectedMetric===m.id?' selected':''}>${htmlEscape(metricMeta(m.id).label)}</option>`).join('')}</select></label><label class="report-control">Calculation<select data-analysis-setting="tableCalculation">${options([['none','Original values'],['running','Running total'],['moving','Moving average'],['share','Percent of total'],['rank','Rank'],['average','Average of groups'],['change','Period change'],['change_percent','Period change %'],['target','Percent of target']],c.tableCalculation)}</select></label><label class="report-control">Moving window<input type="number" min="1" max="365" value="${c.movingWindow||7}" data-analysis-setting="movingWindow"></label><label class="report-control">Top N<input type="number" min="1" max="10000" placeholder="All categories" value="${c.topN||''}" data-analysis-setting="topN"></label><label class="report-control">Reference label<input type="text" value="${htmlEscape(c.referenceLabel||'Target')}" data-analysis-setting="referenceLabel"></label><label class="report-control">Reference source<select data-analysis-setting="referenceSource">${options([['none','Entered target / budget'],['prior_average','Previous-period average']],c.referenceSource)}</select></label><label class="report-control">Target / reference line<input type="number" step="any" value="${c.referenceValue??''}" data-analysis-setting="referenceValue"></label><label class="report-control">What-if change (%)<input type="number" step="any" value="${c.whatIfPercent||0}" data-analysis-setting="whatIfPercent"></label><label class="report-control">Comparison<select data-analysis-setting="compare">${options([['none','None'],['previous','Previous period'],['1','Previous year'],['2','Two years ago'],['custom','Custom baseline']],c.compare)}</select></label><div data-custom-baseline${c.compare==='custom'?'':' hidden'}><label class="report-control">Baseline start<input type="date" data-analysis-setting="baselineStart" value="${htmlEscape(c.baselineStart||'')}"></label><label class="report-control">Baseline end<input type="date" data-analysis-setting="baselineEnd" value="${htmlEscape(c.baselineEnd||'')}"></label></div><label class="report-control">Cross-filter other modules<input type="checkbox" data-analysis-setting="crossFilter"${c.crossFilter?' checked':''}></label><label class="report-control">X Axis Range<select data-analysis-setting="xAxisMode">${options([['none','Auto Fit'],['full','Full range']],c.xAxisMode)}</select></label><label class="report-control">Numeric X minimum<input type="number" step="any" data-analysis-setting="xMin" value="${c.xMin??''}" placeholder="Automatic"></label><label class="report-control">Numeric X maximum<input type="number" step="any" data-analysis-setting="xMax" value="${c.xMax??''}" placeholder="Automatic"></label><label class="report-control">Include Zero<input type="checkbox" data-analysis-setting="includeZero"${c.includeZero!==false?' checked':''}></label>${parameterInputs({...activeSheet().parameterValues,...c.parameterValues},'module')}<button type="button" data-analysis-apply>Apply Analysis</button><button type="button" data-drill-records>View underlying records</button><button type="button" data-reset-module-parameters>Use sheet parameter defaults</button><small>Analysis uses filtered groups in displayed order. Ratios display as percentages; zero denominators stay blank. Numeric X bounds apply to horizontal value axes. Date/category axes fit the first and last plotted values, preserving interior gaps. What-if results are estimates; source data is unchanged.</small></div></details>`;
  }

  function transformReportSeries(series, config) {
    const originals = new Map(series.map(s => [s, [...s.values]]));
    for (const s of series) {
      let values = s.values.map(v => Number.isFinite(v) ? v * (1 + Number(config.whatIfPercent ||
        0) / 100) : null);
      const finite = values.filter(Number.isFinite),
        sum = finite.reduce((a, b) => a + b, 0),
        average = finite.length ? sum / finite.length : null;
      if (config.tableCalculation === 'running') {
        let total = 0;
        values = values.map(v => v == null ? null : (total += v));
      }
      if (config.tableCalculation === 'moving') {
        const source = values;
        values = source.map((v, i) => {
          const window = source.slice(Math.max(0, i - Math.max(1, Number(config
            .movingWindow) || 7) + 1), i + 1).filter(Number.isFinite);
          return v == null || !window.length ? null : window.reduce((a, b) => a + b, 0) /
            window.length;
        });
      }
      if (config.tableCalculation === 'share') values = values.map(v => v == null || sum === 0 ?
        null : v / sum);
      if (config.tableCalculation === 'rank') {
        const sorted = [...new Set(finite)].sort((a, b) => b - a);
        values = values.map(v => v == null ? null : sorted.indexOf(v) + 1);
      }
      if (config.tableCalculation === 'average') values = values.map(v => v == null ? null :
        average);
      if (config.tableCalculation === 'target') values = values.map(v => v == null || !Number(
        config.referenceValue) ? null : v / Number(config.referenceValue));
      if (['change', 'change_percent'].includes(config.tableCalculation)) {
        const baseline = series.find(other => other.metricId === s.metricId && other.facet === s
          .facet && other.seriesKey === s.seriesKey && other.periodKey === 1);
        values = values.map((v, i) => {
          const previous = baseline ? originals.get(baseline)?.[i] : null;
          return s.periodKey !== 0 || v == null || !Number.isFinite(previous) ? null : config
            .tableCalculation === 'change' ? v - previous : previous === 0 ? null : (v -
              previous) / Math.abs(previous);
        });
      }
      s.originalValues = originals.get(s);
      s.baselineValues = series.find(other => other.metricId === s.metricId && other.facet === s
        .facet && other.seriesKey === s.seriesKey && other.periodKey === 1);
      s.baselineValues = s.baselineValues ? originals.get(s.baselineValues) : null;
      s.values = values;
    }
  }

  function reportTransformTotal(series, original, config) {
    const values = series.values.filter(Number.isFinite);
    if (config.tableCalculation === 'running') {
      const raw = (series.originalValues || []).filter(Number.isFinite);
      return raw.length ? raw.reduce((a, b) => a + b, 0) * (1 + Number(config.whatIfPercent ||
        0) / 100) : values.at(-1) ?? null;
    }
    if (config.tableCalculation === 'moving') return values.at(-1) ?? null;
    if (config.tableCalculation === 'share') return values.length ? 1 : null;
    if (config.tableCalculation === 'target') return original == null || !Number(config
        .referenceValue) ? null : original * (1 + Number(config.whatIfPercent || 0) / 100) /
      Number(config.referenceValue);
    if (config.tableCalculation === 'change_percent') {
      const baseline = (series.baselineValues || []).filter(Number.isFinite).reduce((a, b) => a +
          b, 0),
        current = (series.originalValues || []).filter(Number.isFinite).reduce((a, b) => a + b,
          0);
      return !baseline ? null : (current * (1 + Number(config.whatIfPercent || 0) / 100) -
        baseline) / Math.abs(baseline);
    }
    if (config.tableCalculation === 'average') return values.length ? values.reduce((a, b) => a +
      b, 0) / values.length : null;
    if (config.tableCalculation === 'rank') return null;
    if (config.tableCalculation === 'change') return values.length ? values.reduce((a, b) => a +
      b, 0) : null;
    return original == null ? null : original * (1 + Number(config.whatIfPercent || 0) / 100);
  }

  function trimReportPlot(labels, series, interactionLabels, options = {}) {
    if (options.xAxisMode === 'full') return {
      labels,
      series,
      interactionLabels
    };
    const occupied = labels.map((_, i) => series.some(s => Number.isFinite(s.values[i]))),
      first = occupied.indexOf(true),
      last = occupied.lastIndexOf(true);
    if (first < 0) return {
      labels: [],
      series: series.map(s => ({
        ...s,
        values: []
      })),
      interactionLabels: []
    };
    return {
      labels: labels.slice(first, last + 1),
      interactionLabels: interactionLabels.slice(first, last + 1),
      series: series.map(s => ({
        ...s,
        values: s.values.slice(first, last + 1),
        pointColors: s.pointColors?.slice(first, last + 1),
        tooltipPoints: s.tooltipPoints?.slice(first, last + 1)
      }))
    };
  }

  function showReportRecords(widget, selection = null) {
    const snapshot = reportDisplaySnapshots.get(widget.id);
    if (!snapshot) {
      toast('Refresh this module before inspecting its underlying groups.');
      return;
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'report-record-dialog';
    dialog.innerHTML =
      '<h3>Underlying records</h3><p>Sample of up to 200 contributing synthetic records after module filters. Shows query fields, identifying keys and selected record details; this is not the complete dataset.</p><button type="button">Close</button><div class="record-groups"></div>';
    const sample = (snapshot.aggregates.sampleRecords || []).filter(row => !selection || String(
      dimensionValue(selection.dimension, row.user_records, row.subscription_records
        ?.subscription_length, null, row)) === String(selection.value));
    const entries = sample.map((row, index) => [`${row.__factTable||'Record'} · ${index+1}`,
      row
    ]);
    for (const [key, bucket] of entries.slice(0, 500)) {
      const details = document.createElement('details'),
        summary = document.createElement('summary'),
        pre = document.createElement('pre');
      summary.textContent = key.split('\u001f').filter(Boolean).join(' · ');
      pre.textContent = JSON.stringify(bucket, (_, v) => v instanceof Map ? Object.fromEntries(
        v) : v, 2);
      details.append(summary, pre);
      dialog.querySelector('.record-groups').append(details);
    }
    if (!entries.length) {
      const note = document.createElement('p');
      note.textContent =
        'No contributing records for this selection in the retained sample. The report may still contain matching records outside the sample.';
      dialog.append(note);
    }
    if (entries.length > 500) {
      const note = document.createElement('p');
      note.textContent = `Showing 500 of ${entries.length} groups.`;
      dialog.append(note);
    }
    document.body.append(dialog);
    dialog.querySelector('button').onclick = () => dialog.close();
    dialog.onclose = () => dialog.remove();
    dialog.showModal();
  }

  function installReportWorkspaceTools() {
    const presentation = $('presentationMode');
    presentation.insertAdjacentHTML('afterend',
      `<button type="button" id="reportLock">Lock Layout</button><button type="button" id="resetReportCrossFilter" hidden>Reset Cross-filter</button><span id="reportSaveState" role="status">Saved in this browser</span>`
    );
    $('reportLock').onclick = () => {
      activeSheet().layoutLocked = !activeSheet().layoutLocked;
      persistReporting();
      applyCanvasView();
    };
    $('resetReportCrossFilter').onclick = async () => {
      const source = activeSheet().crossFilter?.source;
      delete activeSheet().crossFilter;
      markSheetWidgetsStale();
      persistReporting();
      renderSheet();
      for (const widget of activeSheet().widgets)
        if (widget.id !== source && widget.kind !== 'placeholder') await refreshWidget(
          widget);
    };
    $('reportCharts').addEventListener('change', e => {
      if (e.target.matches('[data-analysis-setting="compare"]')) {
        e.target.closest('[data-analysis-controls]').querySelector('[data-custom-baseline]')
          .hidden = e.target.value !== 'custom';
      }
      if (e.target.matches('[data-module-select]')) {
        const widget = activeSheet().widgets.find(w => w.id === e.target.dataset
          .moduleSelect);
        if (widget) {
          widget.locked = e.target.checked;
          const article = widgetElement(widget.id);
          if (article) article.dataset.locked = String(widget.locked);
          persistReporting();
        }
      }
    });
    $('reportCharts').addEventListener('click', async e => {
      const article = e.target.closest('[data-widget-id]'),
        widget = activeSheet().widgets.find(w => w.id === article?.dataset.widgetId);
      if (!widget) return;
      if (e.target.closest('[data-drill-records]')) showReportRecords(widget);
      if (e.target.closest('[data-reset-module-parameters]')) {
        delete widget.config.parameterValues;
        markWidgetStale(widget);
        persistReporting();
        renderSheet();
      }
      if (e.target.closest('[data-analysis-apply]')) {
        try {
          const changes = {};
          article.querySelectorAll('[data-analysis-setting]').forEach(input => {
            changes[input.dataset.analysisSetting] = input.type === 'checkbox' ? input
              .checked : input.type === 'number' ? (input.value === '' ? '' : Number(
                input.value)) : input.value;
          });
          if ((changes.topN !== '' && (!Number.isInteger(changes.topN) || changes.topN <
              1 || changes.topN > 10000)) || !Number.isInteger(changes.movingWindow) ||
            changes.movingWindow < 1 || changes.movingWindow > 365) throw Error(
            'Top N must be 1–10,000 and moving window must be 1–365.');
          if (changes.xMin !== '' && changes.xMax !== '' && changes.xMin >= changes.xMax)
            throw Error('X minimum must be below X maximum.');
          if (changes.compare === 'custom' && (!changes.baselineStart || !changes
              .baselineEnd || changes.baselineStart > changes.baselineEnd)) throw Error(
            'Choose a valid custom baseline.');
          const params = {
            ...widget.config.parameterValues
          };
          article.querySelectorAll('[data-report-parameter]').forEach(input => {
            if (input.dataset.parameterEdited !== 'true') return;
            const p = reportParameters.find(p => p.name === input.dataset
              .reportParameter);
            params[p.name] = parameterValue(p, {
              [p.name]: input.value
            });
          });
          const needsData = changes.compare !== widget.config.compare || (changes
              .selectedMetric || '') !== (widget.config.selectedMetric || '') || JSON
            .stringify(params) !== JSON.stringify(widget.config.parameterValues || {}) || (
              changes.baselineStart || '') !== (widget.config.baselineStart || '') || (
              changes.baselineEnd || '') !== (widget.config.baselineEnd || '');
          Object.assign(widget.config, changes, {
            parameterValues: params
          });
          persistReporting();
          renderSheet();
          if (needsData) await refreshWidget(widget);
          else await redrawDisplayedReport(widget, changes);
        } catch (error) {
          toast(error.message);
        }
      }
      const point = e.target.closest('[data-report-index]');
      if (point && !widget.config.crossFilter) {
        const plan = axisPlan(widget.config);
        if (plan.categoryDims.length === 1 && !isFullDateDimension(plan.categoryDims[0]))
          showReportRecords(widget, {
            dimension: plan.categoryDims[0],
            value: point.dataset.reportValue
          });
      }
      if (point && widget.config.crossFilter) {
        const plan = axisPlan(widget.config);
        if (plan.categoryDims.length !== 1 || isFullDateDimension(plan.categoryDims[0])) {
          toast('Cross-filtering needs one non-date category dimension.');
          return;
        }
        activeSheet().crossFilter = {
          source: widget.id,
          dimension: plan.categoryDims[0],
          includeValues: [point.dataset.reportValue]
        };
        for (const other of activeSheet().widgets)
          if (other.id !== widget.id) markWidgetStale(other);
        persistReporting();
        renderSheet();
        for (const other of activeSheet().widgets)
          if (other.id !== widget.id && other.kind !== 'placeholder') await refreshWidget(
            other);
        toast('Other modules filtered by ' + point.dataset.reportValue + '.');
      }
    });
    document.addEventListener('input', e => {
      if (e.target.matches('[data-parameter-scope="module"]')) e.target.dataset
        .parameterEdited = 'true';
      if (e.target.closest(
          '#reportCharts,.sheet-toolbar,[data-field-section="parameters"]') && $(
          'reportSaveState')) $(
        'reportSaveState').textContent = 'Unsaved changes';
    });
    window.addEventListener('resize', () => requestAnimationFrame(applyCanvasView));
    document.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.target.closest(
          'input,textarea,[contenteditable="true"]') || e.key.toLowerCase() !== 'z') return;
      if ($('reportCanvasScroll')?.offsetParent) {
        e.preventDefault();
        travelReportHistory(e.shiftKey ? 'redo' : 'undo');
      }
    });
  }

  // Definition cards edit the canonical dictionary source without losing source comments or parameters.
  let dictionaryCardSegments = [],
    dictionaryCardsSource = null,
    activeDefinitionInput = null;
  let selectedReportModuleId = null,
    selectedReportSheetId = null,
    dispatchingReportToolbarAction = false;

  function splitDefinitionCards(source) {
    const result = [],
      header = /\b(dimension|date|measure|parameter)\s*:\s*([A-Za-z_]\w*)\s*\{/g;
    let match, last = 0;
    while ((match = header.exec(source))) {
      if (match.index > last) result.push({
        text: source.slice(last, match.index)
      });
      let depth = 1,
        end = header.lastIndex,
        quote = null;
      for (; end < source.length && depth; end++) {
        const char = source[end];
        if (quote) {
          if (char === '\\') {
            end++;
            continue;
          }
          if (char === quote) {
            if (source[end + 1] === quote) {
              end++;
              continue;
            }
            quote = null;
          }
          continue;
        }
        if (char === "'" || char === '"') {
          quote = char;
          continue;
        }
        if (char === '{') depth++;
        if (char === '}') depth--;
      }
      const raw = source.slice(match.index, end),
        kind = match[1];
      let label = (raw.match(/^\s*label\s*:\s*["']?(.*?)["']?\s*$/m) || [])[1] || 'Unlabelled';
      let type = kind;
      if (kind === 'dimension' && /^\s*type\s*:\s*date\s*$/m.test(raw)) type = 'date';
      result.push({
        key: 'definition_' + result.length,
        kind,
        type,
        name: match[2],
        label,
        raw
      });
      last = end;
      header.lastIndex = end;
    }
    if (last < source.length) result.push({
      text: source.slice(last)
    });
    return result;
  }

  function syncDefinitionCards() {
    const editor = $('definitionEditor');
    if (!editor || !$('definitionCards')) return editor?.value || '';
    if (dictionaryCardsSource !== editor.value) return editor.value;
    const inputs = new Map([...document.querySelectorAll('[data-definition-card-source]')].map(
      input => [input.dataset.definitionCardSource, input]));
    for (const segment of dictionaryCardSegments) {
      const input = inputs.get(segment.key);
      if (input) segment.raw = input.value;
    }
    editor.value = dictionaryCardSegments.map(segment => segment.key ? segment.raw : segment.text)
      .join('');
    dictionaryCardsSource = editor.value;
    return editor.value;
  }

  const definitionCardStatusCache = new Map();
  let definitionCardValidationTimer = null;

  // Check one draft against applied definitions, so an unrelated unfinished card cannot mark it red.
  function definitionCardCandidate(segment) {
    let replaced = false;
    return splitDefinitionCards(serializeLookmlDefinitions()).map(block => {
      if (block.key && definitionIdentity(block) === definitionIdentity(segment)) {
        replaced = true;
        return segment.raw;
      }
      return block.key ? block.raw : block.text;
    }).join('') + (replaced ? '' : '\n\n' + segment.raw);
  }

  function definitionCardStatus(segment) {
    const cacheKey = definitionRevision + '\0' + segment.kind + '\0' + segment.name + '\0' +
      segment.raw;
    if (definitionCardStatusCache.has(cacheKey)) return definitionCardStatusCache.get(cacheKey);
    const priorParameters = reportParameters;
    let result;
    try {
      const blocks = splitDefinitionCards(segment.raw).filter(block => block.key);
      if (blocks.length !== 1) throw Error('Each card must contain exactly one definition.');
      const parsed = blocks[0],
        resolved = resolveLookmlDefinitions(definitionCardCandidate(segment));
      const before = segment.kind === 'parameter' ? priorParameters.find(p => p.name === segment
        .name) : (segment.kind === 'measure' ? customMetrics : customAttributes).find(item =>
        item.lookmlName === segment.name);
      const after = parsed.kind === 'parameter' ? reportParameters.find(p => p.name === parsed
        .name) : (parsed.kind === 'measure' ? resolved.measures : resolved.dimensions).find(
        item => item.lookmlName === parsed.name);
      const properties = ['lookmlName', 'name', 'label', 'type', 'base', 'source', 'caseExpr',
        'datePart', 'kind', 'formula', 'aggregation', 'format', 'numerator', 'denominator',
        'asPercent', 'percentScale', 'tableMode', 'tableScope', 'tablePartition', 'tableOrder',
        'factTable', 'default', 'min', 'max', 'allowed_values'
      ];
      const signature = item => JSON.stringify(properties.map(key => item?.[key] ?? null));
      const applied = !!before && !!after && signature(before) === signature(after);
      result = {
        state: applied ? 'saved' : 'draft',
        label: applied ? 'Saved · Valid' : 'Needs saving',
        message: applied ? 'Valid and applied.' : 'New or changed definition. Apply to save.'
      };
    } catch (error) {
      result = {
        state: 'error',
        label: 'Error',
        message: error.message
      };
    } finally {
      reportParameters = priorParameters;
    }
    if (definitionCardStatusCache.size > 1000) definitionCardStatusCache.clear();
    definitionCardStatusCache.set(cacheKey, result);
    return result;
  }

  // A transparent mirror adds diagnostics without replacing the native textarea or its selection.
  function definitionErrorRanges(source, message) {
    const ranges = [],
      add = (start, end) => {
        if (start >= 0 && end > start) ranges.push({
          start,
          end
        });
      };
    const reference = message.match(/Unknown field reference \[([^\]]+)\]/);
    const namedReference = message.match(/(?:reference|field):?\s*(\$\{[^}]+\}|\{\{[^}]+\}\})/i);
    if (reference) {
      for (const token of ['${' + reference[1] + '}', '[' + reference[1] + ']']) {
        let index = source.indexOf(token);
        while (index >= 0) {
          add(index, index + token.length);
          index = source.indexOf(token, index + token.length);
        }
      }
    }
    if (namedReference) {
      const index = source.indexOf(namedReference[1]);
      add(index, index + namedReference[1].length);
    }
    const token = (message.match(/Unsupported SQL token:\s*([A-Za-z_]\w*)/i) || message.match(
      /Unsupported measure type\s+(\w+)/i) || message.match(
      /(?:Unknown|Unsupported) (?:function|operator):?\s*([A-Za-z_]\w*)/i))?.[1];
    if (!ranges.length && token) {
      const expression = new RegExp('\\b' + token + '\\b', 'gi');
      for (const match of source.matchAll(expression)) add(match.index, match.index + match[0]
        .length);
    }
    if (!ranges.length) {
      const property = /table_order/i.test(message) ? 'table_order' : /table_partition/i.test(
          message) ? 'table_partition' : /needs a type|type must/i.test(message) ? 'type' :
        /date_part/i.test(message) ? 'date_part' : /Unsupported property/i.test(message) ? null :
        'sql';
      const line = property ? new RegExp('^\\s*' + property + '\\s*:\\s*([^\\n]*)', 'm').exec(
        source) : null;
      if (line) {
        const start = line.index + line[0].indexOf(property);
        add(start, line.index + line[0].length);
      } else {
        const header = /\b(?:measure|dimension|date|parameter)\s*:\s*\w+/.exec(source);
        add(header?.index ?? 0, (header?.index ?? 0) + (header?.[0].length || Math.max(1, source
          .length)));
      }
    }
    return ranges.sort((a, b) => a.start - b.start).filter((range, index, all) => !index || range
      .start >= all[index - 1].end);
  }

  function syncDefinitionErrorMirror(input) {
    const layer = input.parentElement.querySelector('.definition-error-layer'),
      mirror = layer?.querySelector('pre');
    if (!mirror) return;
    const style = getComputedStyle(input);
    for (const property of ['font', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
        'lineHeight', 'letterSpacing', 'wordSpacing', 'tabSize', 'paddingTop', 'paddingRight',
        'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth',
        'borderBottomWidth', 'borderLeftWidth'
      ]) mirror.style[property] = style[property];
    mirror.style.transform = `translate(${-input.scrollLeft}px,${-input.scrollTop}px)`;
    mirror.style.width = input.offsetWidth + 'px';
    layer.style.width = input.offsetWidth + 'px';
    layer.style.height = input.offsetHeight + 'px';
  }
  const definitionErrorResizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(
    entries => entries.forEach(entry => syncDefinitionErrorMirror(entry.target))) : null;

  function renderDefinitionErrors(card, status) {
    const input = card.querySelector('textarea'),
      host = input.parentElement;
    let layer = host.querySelector('.definition-error-layer');
    input.setAttribute('aria-invalid', String(status.state === 'error'));
    if (status.state !== 'error') {
      layer?.remove();
      definitionErrorResizeObserver?.unobserve(input);
      return;
    }
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'definition-error-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.append(document.createElement('pre'));
      host.append(layer);
      definitionErrorResizeObserver?.observe(input);
    }
    const ranges = definitionErrorRanges(input.value, status.message);
    let last = 0,
      html = '';
    for (const range of ranges) {
      html += htmlEscape(input.value.slice(last, range.start)) +
        '<mark class="definition-error-token">' + htmlEscape(input.value.slice(range.start, range
          .end)) + '</mark>';
      last = range.end;
    }
    layer.querySelector('pre').innerHTML = html + htmlEscape(input.value.slice(last)) + '\n';
    const meta = card.querySelector('.definition-card-meta');
    meta.id = 'definition-error-' + card.dataset.definitionCard.replace(/[^a-zA-Z0-9_-]/g, '_');
    input.setAttribute('aria-describedby', meta.id);
    syncDefinitionErrorMirror(input);
  }

  function updateDefinitionCardStatus(card, forced = null) {
    const segment = dictionaryCardSegments.find(s => s.key === card.dataset.definitionCard);
    if (!segment) return;
    const status = forced || definitionCardStatus(segment);
    card.dataset.definitionStatus = status.state;
    const badge = card.querySelector('[data-definition-status-label]');
    if (badge) {
      badge.textContent = status.label;
      badge.title = status.message;
    }
    renderDefinitionErrors(card, status);
    const meta = card.querySelector('.definition-card-meta');
    if (meta) {
      meta.textContent = status.state === 'error' ? status.message : status.state === 'draft' ?
        status.message : definitionCardMetadata(segment);
    }
  }

  function closeDefinitionEditors({
    applyChanges = false
  } = {}) {
    clearTimeout(definitionCardValidationTimer);
    collectDefinitionSource();
    const open = document.querySelector('[data-definition-card][open]');
    if (applyChanges && open) {
      const segment = dictionaryCardSegments.find(s => s.key === open.dataset.definitionCard),
        status = segment && definitionCardStatus(segment);
      if (status?.state === 'error') {
        updateDefinitionCardStatus(open, status);
        const input = open.querySelector('textarea');
        input.focus({
          preventScroll: true
        });
        return false;
      }
      if (status?.state === 'draft' && !applyIndividualDefinition(open.dataset.definitionCard))
        return false;
    }
    document.querySelectorAll('[data-definition-card][open]').forEach(card => {
      updateDefinitionCardStatus(card);
      card.open = false;
    });
    document.body.classList.remove('definition-editor-open');
    return true;
  }

  function removeDefinitionCard(key) {
    collectDefinitionSource();
    const segment = dictionaryCardSegments.find(s => s.key === key);
    if (!segment) return false;
    const fields = [...customAttributes, ...customMetrics],
      field = fields.find(item => item.lookmlName === segment.name),
      dependents = field ? fields.filter(item => item.id !== field.id).filter(item => {
        const refs = ReportingTools.dependencies(item, customMetrics, customAttributes);
        return [...refs.measures, ...refs.dimensions].includes(field.id);
      }) : [];
    if (dependents.length) {
      toast('Cannot delete ' + segment.name + '. Update dependent definitions first: ' +
        dependents.map(d => d.lookmlName).join(', '));
      return false;
    }
    const reports = affectedReportNames([segment.name]);
    if (!window.confirm('Delete ' + segment.name + '?' + (reports.length ? ' Reports using it: ' +
        reports.join(', ') + '. Their fields will need updating.' : ''))) return false;
    const affected = definitionAffectedWidgetIds(segment, segment);
    if (segment.kind === 'measure') customMetrics = customMetrics.filter(item => item
      .lookmlName !== segment.name);
    else if (segment.kind === 'parameter') reportParameters = reportParameters.filter(item => item
      .name !== segment.name);
    else customAttributes = customAttributes.filter(item => item.lookmlName !== segment.name);
    dictionaryCardSegments = dictionaryCardSegments.filter(s => s.key !== key);
    $('definitionEditor').value = dictionaryCardSegments.map(s => s.key ? s.raw : s.text).join(
      '');
    dictionaryCardsSource = null;
    invalidateAppliedDefinition(affected);
    collectDefinitionSource();
    addDefinitionHistory(segment.kind, segment.name, 'Deleted');
    persistDefinitionHistory();
    persistReporting();
    renderDefinitionCardStack();
    renderDictionary();
    renderSheet();
    return true;
  }

  function definitionCardMetadata(card) {
    const item = (card.type === 'measure' ? customMetrics : customAttributes).find(field => field
      .lookmlName === card.name);
    if (!item) return 'New definition · Apply to validate';
    const info = ReportingTools.lineage(item, customMetrics, customAttributes),
      dependencies = [...info.measures.map(id => metricMeta(id).label), ...info.dimensions.map(
        dimensionLabel)];
    return `${info.errors.length?'Check formula':'Applied definition'} · ${info.tables.join(', ')||'Calculated'} · ${info.grain} · ${info.aggregation}${dependencies.length?' · Depends on '+dependencies.join(', '):''}`;
  }

  function renderDefinitionCardStack(focusName = '') {
    const host = $('definitionCards');
    if (!host) return;
    const source = $('definitionEditor').value;
    dictionaryCardSegments = splitDefinitionCards(source);
    dictionaryCardsSource = source;
    const groups = [
      ['dimension', 'Dimensions'],
      ['date', 'Dates'],
      ['measure', 'Measures'],
      ['parameter', 'Parameters']
    ];
    definitionErrorResizeObserver?.disconnect();
    host.innerHTML = groups.map(([type, title]) => {
      const cards = dictionaryCardSegments.filter(s => s.key && s.type === type),
        labels = [...new Set(cards.map(s => s.label))].sort((a, b) => a.localeCompare(b));
      return `<section class="definition-type-stack" data-definition-type-group="${type}"><h3>${title}</h3>${labels.map(label=>`<details class="definition-label-stack"${focusName&&cards.some(card=>card.label===label&&card.name===focusName)?' open':''}><summary>${htmlEscape(label)}</summary><div class="definition-card-stack">${cards.filter(c=>c.label===label).sort((a,b)=>a.name.localeCompare(b.name)).map(card=>`<details class="definition-formula-card metric-card" data-definition-card="${card.key}"${card.name===focusName?' open':''}><summary><span>${htmlEscape(card.name)}</span><small class="definition-status-label" data-definition-status-label role="status"></small><button type="button" class="definition-delete-button" data-definition-remove="${card.key}" aria-label="Delete ${htmlEscape(card.name)}" title="Delete ${htmlEscape(card.name)}">×</button></summary><div class="definition-card-body"><div class="definition-card-actions"><button type="button" class="secondary" data-definition-close-card>Close</button><button type="button" class="secondary" data-definition-apply="${card.key}">Apply</button><button type="button" class="secondary" data-definition-duplicate="${card.key}">Duplicate</button><button type="button" class="secondary" data-definition-evaluate="${card.key}">Evaluate Sample</button><button type="button" class="secondary" data-definition-close-evaluation="${card.key}" hidden>Close Evaluator</button><button type="button" class="secondary" data-definition-remove="${card.key}">Remove</button></div><div class="definition-card-meta">${htmlEscape(definitionCardMetadata(card))}</div><div class="definition-card-editor"><textarea class="definition-code" data-definition-card-source="${card.key}" aria-label="${htmlEscape(card.name)} definition" spellcheck="false">${htmlEscape(card.raw)}</textarea><div class="code-suggestions" data-code-suggestions hidden></div></div><div class="definition-card-result" aria-live="polite" hidden></div></div></details>`).join('')}</div></details>`).join('')||'<p class="definition-stack-empty">No definitions yet.</p>'}</section>`;
    }).join('');
    host.querySelectorAll('[data-definition-card]').forEach(card => updateDefinitionCardStatus(
      card));
    document.body.classList.toggle('definition-editor-open', !!host.querySelector(
      '[data-definition-card][open]'));
  }

  function createDefinitionCard(kind, sourceCard = null) {
    const source = collectDefinitionSource(),
      segments = splitDefinitionCards(source),
      names = new Set(segments.filter(s => s.key).map(s => s.name));
    const original = sourceCard && dictionaryCardSegments.find(s => s.key === sourceCard);
    const base = original ? original.name + '_copy' : kind === 'date' ? 'new_date' : kind ===
      'measure' ? 'new_measure' : kind === 'parameter' ? 'new_parameter' : 'new_dimension';
    let name = base,
      index = 2;
    while (names.has(name)) name = base + '_' + index++;
    const raw = original ? original.raw.replace(new RegExp('(^\\s*' + original.kind +
        '\\s*:\\s*)' + original.name + '\\b'), (_, prefix) => prefix + name) : kind ===
      'parameter' ? `parameter: ${name} {\n  label: "Custom"\n  type: number\n  default: 1\n}` :
      `${kind}: ${name} {\n  label: "Custom"\n  type: ${kind==='measure'?'sum':kind==='date'?'date':'string'}\n${kind==='measure'?'  fact_table: subscription_records\n':''}  sql: ${kind==='measure'?'1':kind==='date'?'DATE(${subscription_records.subscription_start_ts})':'${user_records.state}'} ;;\n${kind==='measure'?'  value_format: numeric\n':''}}`;
    $('definitionEditor').value = source.trimEnd() + '\n\n' + raw + '\n';
    dictionaryCardsSource = null;
    collectDefinitionSource();
    renderDefinitionCardStack(name);
    $('definitionStatus').textContent =
      'Definition added to draft. Save definitions to use it in Reporting.';
  }

  function evaluateDefinitionCard(key) {
    collectDefinitionSource();
    const segment = dictionaryCardSegments.find(s => s.key === key),
      card = [...document.querySelectorAll('[data-definition-card]')].find(c => c.dataset
        .definitionCard === key);
    if (!segment || !card) return;
    const output = card.querySelector('.definition-card-result');
    output.hidden = false;
    output.classList.remove('definition-apply-error');
    card.querySelector('[data-definition-close-evaluation]').hidden = false;
    if (segment.kind === 'parameter') {
      try {
        const p = parseParameterDefinitions(segment.raw).parameters[0];
        output.textContent = `Default: ${p.default} · Type: ${p.type}`;
      } catch (e) {
        output.textContent = e.message;
      }
      return;
    }
    const priorEditor = $('evaluationCode').value,
      priorDefinitions = $('definitionEditor').value;
    const priorDimensions = customAttributes,
      priorMeasures = customMetrics,
      priorParameters = reportParameters;
    try {
      // Unsaved sibling definitions are included, so derived definitions evaluate in the same draft context.
      const resolved = resolveLookmlDefinitions(priorDefinitions);
      customAttributes = resolved.dimensions;
      customMetrics = resolved.measures;
      $('evaluationCode').value = segment.raw;
      evaluateDictionaryPreview();
      output.innerHTML = `<p>${htmlEscape($('evaluationStatus').textContent)}</p>` + $(
        'evaluationResults').innerHTML;
    } catch (error) {
      output.textContent = error.message;
    } finally {
      $('evaluationCode').value = priorEditor;
      customAttributes = priorDimensions;
      customMetrics = priorMeasures;
      reportParameters = priorParameters;
    }
  }

  function updateSelectedModuleToolbar() {
    const toolbar = $('selectedModuleToolbar'),
      widget = activeSheet().widgets.find(w => w.id === selectedReportModuleId);
    if (!toolbar) return;
    if (!widget || document.body.classList.contains('presentation-mode') || $('reportingView')
      .hidden) {
      toolbar.hidden = true;
      restoreSidebarSetup();
      updateReportSetupLayout(false);
      positionSelectedModuleToolbar();
      return;
    }
    document.querySelectorAll('#reportCharts > .report-widget').forEach(el => el.classList.toggle(
      'module-selected', el.dataset.widgetId === widget.id));
    const placeholder = widget.kind === 'placeholder';
    toolbar.innerHTML =
      `<strong>${htmlEscape(widget.name||'Report module')}</strong>${(placeholder?[['duplicate','Duplicate'],['remove','Remove']]:[['refresh','Refresh'],['recalculate','Recalculate'],['flip','Flip Axis'],['remove','Remove'],['toggle-report',widget.config.reportHidden?'Show Report':'Hide Report'],['duplicate','Duplicate'],['export-csv','CSV']]).map(([action,label])=>`<button type="button" class="secondary" data-selected-module-action="${action}"${action==='export-csv'&&widget.config.chartType!=='spreadsheet'?' disabled':''}>${label}</button>`).join('')}`;
    toolbar.hidden = false;
    renderSidebarSetup();
    positionSelectedModuleToolbar();
  }

  function positionSelectedModuleToolbar() {
    const toolbar = $('selectedModuleToolbar'),
      frame = $('reportCanvasScroll'),
      space = $('selectedModuleToolbarSpace');
    if (!toolbar || !frame || !space) return;
    if (toolbar.hidden) {
      space.hidden = true;
      frame.style.clipPath = '';
      return;
    }
    space.hidden = false;
    const canvas = frame.getBoundingClientRect();
    const sidebar = document.querySelector('.mockup3-report-sidebar'),
      sidebarRect = sidebar?.getBoundingClientRect();
    const canvasLeft = canvas.left + frame.clientLeft,
      canvasRight = Math.min(canvas.right - frame.clientLeft, canvasLeft + frame.clientWidth);
    const sidebarEdge = innerWidth > 900 && sidebarRect ? sidebarRect.right : 0;
    const left = Math.max(0, canvasLeft, sidebarEdge),
      right = Math.min(canvasRight, document.documentElement.clientWidth);
    const width = Math.max(0, right - left);
    toolbar.style.visibility = width >= 140 ? 'visible' : 'hidden';
    toolbar.style.left = left + 'px';
    toolbar.style.width = width + 'px';
    // Reconcile actual rendered bounds, including browser page-panning offsets.
    const rendered = toolbar.getBoundingClientRect();
    if (Math.abs(rendered.left - left) > .25) toolbar.style.left = (left + left - rendered.left) +
      'px';
    // A real layout row moves every module down by the bar's current wrapped height.
    space.style.height = (toolbar.offsetHeight + 12) + 'px';
    const reserved = space.getBoundingClientRect();
    toolbar.style.top = Math.max(8, Math.min(reserved.top + 6, innerHeight - toolbar
      .offsetHeight - 8)) + 'px';
    // When the bar pins during page scrolling, don't paint chart content underneath it.
    const frameRect = frame.getBoundingClientRect(),
      toolbarRect = toolbar.getBoundingClientRect();
    const covered = toolbar.style.visibility === 'hidden' ? 0 : Math.max(0, Math.min(frameRect
      .height, toolbarRect.bottom + 6 - frameRect.top));
    frame.style.clipPath = covered > .5 ? `inset(${covered}px 0 0 0)` : '';
  }

  function observeFloatingToolbarBounds() {
    if (typeof ResizeObserver !== 'function') return;
    let pending = 0;
    const observer = new ResizeObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        positionSelectedModuleToolbar();
      });
    });
    [$('reportCanvasScroll'), $('selectedModuleToolbar'), document.querySelector(
      '.report-results'), document.querySelector(
      '.mockup3-report-sidebar')].filter(Boolean).forEach(node => observer.observe(node));
    document.fonts?.ready.then(positionSelectedModuleToolbar);
  }

  function selectReportModule(id = null) {
    if (id !== selectedReportModuleId) {
      restoreSidebarSetup();
      sidebarOpenSections.clear();
      sidebarSetupOwner = null;
    }
    selectedReportModuleId = id;
    selectedReportSheetId = id ? activeSheetId : null;
    document.querySelectorAll('#reportCharts > .report-widget').forEach(el => el.classList.toggle(
      'module-selected', el.dataset.widgetId === id));
    updateSelectedModuleToolbar();
  }

  function installDefinitionAndModuleCards() {
    const editor = $('definitionEditor');
    editor.parentElement.hidden = true;
    document.querySelector('#dictionaryView .syntax-assist-card')?.remove();
    document.querySelector('#dictionaryView .dictionary-evaluator').hidden = true;
    const workspace = document.querySelector('.definition-editor-workspace');
    workspace.before($('definitionStatus'));
    workspace.insertAdjacentHTML('beforeend',
      '<div id="definitionCardWorkspace"><div class="definition-create-actions"><button type="button" class="secondary" data-create-definition="dimension">+ Dimension</button><button type="button" class="secondary" data-create-definition="date">+ Date</button><button type="button" class="secondary" data-create-definition="measure">+ Measure</button><button type="button" class="secondary" data-create-definition="parameter">+ Parameter</button></div><div class="definition-library-tools"><input id="definitionSearch" type="search" placeholder="Search definitions, labels, columns, or SQL" aria-label="Search definitions"><button type="button" class="secondary" data-definition-folders="expand">Expand All</button><button type="button" class="secondary" data-definition-folders="collapse">Collapse All</button></div><div id="definitionCards"></div></div>'
    );
    document.querySelector('.dictionary-heading p').textContent =
      'Open a definition card to edit its formula, duplicate it, or evaluate a sample. Definitions are grouped by type and label.';
    workspace.addEventListener('input', event => {
      if (event.target.matches('[data-definition-card-source]')) {
        event.target.closest('[data-definition-card]').querySelector('.definition-card-meta')
          .textContent = 'Unsaved draft · Apply to validate';
        activeDefinitionInput = event.target;
        collectDefinitionSource();
        const card = event.target.closest('[data-definition-card]');
        updateDefinitionCardStatus(card, {
          state: 'draft',
          label: 'Needs saving',
          message: 'Changes pending validation. Apply to save.'
        });
        clearTimeout(definitionCardValidationTimer);
        definitionCardValidationTimer = setTimeout(() => updateDefinitionCardStatus(card),
          220);
        renderCodeSuggestions(event.target);
        event.target.closest('[data-definition-card]').querySelector(
          '.definition-card-result').hidden = true;
        event.target.closest('[data-definition-card]').querySelector(
          '[data-definition-close-evaluation]').hidden = true;
      }
    });
    workspace.addEventListener('focusin', event => {
      if (event.target.matches('[data-definition-card-source]')) activeDefinitionInput = event
        .target;
    });
    workspace.addEventListener('scroll', event => {
      if (event.target.matches('[data-definition-card-source]')) syncDefinitionErrorMirror(
        event.target);
    }, true);
    workspace.addEventListener('keyup', event => {
      if (event.target.matches('[data-definition-card-source]')) renderCodeSuggestions(event
        .target);
    });
    workspace.addEventListener('keydown', event => {
      const open = event.target.closest('[data-definition-card][open]');
      if (open && event.key === 'Tab') {
        const controls = [...open.querySelectorAll(
          'summary,button,input,textarea,select,[tabindex="0"]')].filter(el => !el.hidden &&
          !el.disabled && el.getClientRects().length);
        const index = controls.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          controls.at(-1)?.focus();
        } else if (!event.shiftKey && index === controls.length - 1) {
          event.preventDefault();
          controls[0]?.focus();
        }
      }
      if (event.target.matches('[data-definition-card-source]')) handleCodeSuggestionKeydown(
        event);
    });
    workspace.addEventListener('mousedown', event => {
      if (event.target.closest(
          '[data-code-suggestion],[data-show-dimension-values],[data-dimension-value]')) event
        .preventDefault();
    });
    workspace.addEventListener('toggle', event => {
      const card = event.target;
      if (!card.matches('[data-definition-card]')) return;
      card.setAttribute('role', card.open ? 'dialog' : 'group');
      card.setAttribute('aria-modal', String(card.open));
      card.setAttribute('aria-label', card.querySelector('summary').textContent.trim());
      if (card.open) {
        updateDefinitionCardStatus(card);
        requestAnimationFrame(() => syncDefinitionErrorMirror(card.querySelector(
          'textarea')));
        workspace.querySelectorAll('[data-definition-card]').forEach(other => {
          if (other !== card) other.open = false;
        });
        card.querySelector('textarea')?.focus({
          preventScroll: true
        });
      }
      document.body.classList.toggle('definition-editor-open', !!workspace.querySelector(
        '[data-definition-card][open]'));
    }, true);
    workspace.addEventListener('input', event => {
      if (event.target.id !== 'definitionSearch') return;
      const search = event.target.value.toLowerCase();
      workspace.querySelectorAll('[data-definition-card]').forEach(card => {
        const source = card.querySelector('textarea').value.toLowerCase();
        card.hidden = !source.includes(search);
      });
      workspace.querySelectorAll('.definition-label-stack').forEach(folder => {
        folder.hidden = ![...folder.querySelectorAll('[data-definition-card]')].some(c =>
          !c.hidden);
        if (search && !folder.hidden) folder.open = true;
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains(
          'definition-editor-open')) closeDefinitionEditors();
    });
    document.addEventListener('click', event => {
      if (!document.body.classList.contains('dictionary-active')) return;
      const open = workspace.querySelector('[data-definition-card][open]');
      if (open && !open.contains(event.target)) {
        const target = event.target,
          targetCard = target.closest('[data-definition-card]'),
          targetKey = targetCard?.dataset.definitionCard,
          button = target.closest('button'),
          buttonAction = button && Object.entries(button.dataset).find(([key]) => key
            .startsWith('definition'));
        if (!closeDefinitionEditors({
            applyChanges: true
          })) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        // Applying re-sorts the cards; forward a click aimed at a card replaced by that render.
        if (!target.isConnected && targetKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const replacement = [...workspace.querySelectorAll('[data-definition-card]')].find(
            card => card.dataset.definitionCard === targetKey);
          const action = buttonAction && replacement?.querySelector('[data-' + buttonAction[0]
            .replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ']');
          (action || replacement?.querySelector('summary'))?.click();
        }
      }
    }, true);
    workspace.addEventListener('click', event => {
      if (event.target.closest('[data-definition-close-card]')) {
        closeDefinitionEditors();
        return;
      }
      const folders = event.target.closest('[data-definition-folders]');
      if (folders) {
        workspace.querySelectorAll('.definition-label-stack').forEach(folder => folder.open =
          folders.dataset.definitionFolders === 'expand');
        return;
      }
      const close = event.target.closest('[data-definition-close-evaluation]');
      if (close) {
        close.closest('[data-definition-card]').querySelector('.definition-card-result')
          .hidden = true;
        close.hidden = true;
        return;
      }
      const apply = event.target.closest('[data-definition-apply]');
      if (apply) {
        applyIndividualDefinition(apply.dataset.definitionApply);
        return;
      }
      const create = event.target.closest('[data-create-definition]'),
        duplicate = event.target.closest('[data-definition-duplicate]'),
        evaluate = event.target.closest('[data-definition-evaluate]'),
        remove = event.target.closest('[data-definition-remove]');
      if (create) createDefinitionCard(create.dataset.createDefinition);
      else if (duplicate) createDefinitionCard(null, duplicate.dataset.definitionDuplicate);
      else if (evaluate) evaluateDefinitionCard(evaluate.dataset.definitionEvaluate);
      else if (remove) {
        event.preventDefault();
        event.stopPropagation();
        removeDefinitionCard(remove.dataset.definitionRemove);
      } else if (event.target.closest(
          '[data-code-suggestion],[data-show-dimension-values],[data-dimension-value]'))
        handleDictionaryAction(event);
    });
    document.body.insertAdjacentHTML('beforeend',
      '<nav id="selectedModuleToolbar" class="selected-module-toolbar" aria-label="Selected report module actions" hidden></nav>'
    );
    const toolbarSpace = document.createElement('div');
    toolbarSpace.id = 'selectedModuleToolbarSpace';
    toolbarSpace.hidden = true;
    toolbarSpace.setAttribute('aria-hidden', 'true');
    $('reportCanvasScroll').before(toolbarSpace);
    $('selectedModuleToolbar').addEventListener('click', event => {
      event.stopPropagation();
      const action = event.target.closest('[data-selected-module-action]')?.dataset
        .selectedModuleAction;
      if (!action) return;
      const widget = activeSheet().widgets.find(w => w.id === selectedReportModuleId),
        element = widget && widgetElement(widget.id);
      if (!widget || !element) return;
      if (action === 'refresh') void refreshWidget(widget).finally(
        updateSelectedModuleToolbar);
      else {
        dispatchingReportToolbarAction = true;
        try {
          element.querySelector(`[data-widget-action="${action}"]`)?.click();
        } finally {
          dispatchingReportToolbarAction = false;
          selectedReportModuleId = activeSheet().widgets.some(w => w.id === widget.id) ?
            widget.id : null;
        }
      }
      updateSelectedModuleToolbar();
    });
    $('reportCharts').addEventListener('click', event => {
      const card = event.target.closest('.report-widget');
      if (card) {
        event.__clickedReportModuleId = card.dataset.widgetId;
        selectReportModule(card.dataset.widgetId);
      }
    }, true);
    $('reportCharts').addEventListener('change', () => queueMicrotask(
      updateSelectedModuleToolbar));
    document.addEventListener('click', event => {
      if (dispatchingReportToolbarAction || event.__moduleSidebarControl) return;
      if (event.__clickedReportModuleId) {
        selectReportModule(activeSheet().widgets.some(w => w.id === event
          .__clickedReportModuleId) ? event.__clickedReportModuleId : null);
        return;
      }
      if (event.target.closest(
          '#selectedModuleToolbar,#reportingView .mockup3-report-sidebar,.filter-picker-menu,[data-code-suggestions],dialog'
        ))
        return;
      const card = event.target.closest('#reportCharts > .report-widget');
      if (card) selectReportModule(card.dataset.widgetId);
      else selectReportModule(null);
    });
    $('reportCharts').addEventListener('focusin', event => {
      const card = event.target.closest('.report-widget');
      if (card) selectReportModule(card.dataset.widgetId);
    });
    window.addEventListener('scroll', positionSelectedModuleToolbar, true);
    window.addEventListener('resize', positionSelectedModuleToolbar);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') selectReportModule(null);
    });
  }

  function validateStoredParameterOverrides(parameters = reportParameters) {
    for (const sheet of reportSheets) {
      const scopes = [
        ['sheet ' + sheet.name, sheet.parameterValues], ...(sheet.widgets || []).map(w => [
          'module ' + w.name, w.config?.parameterValues
        ])
      ];
      for (const [name, values] of scopes)
        for (const parameter of parameters) {
          if (values && Object.hasOwn(values, parameter.name)) try {
            parameterValue(parameter, values);
          } catch (error) {
            throw Error('Existing ' + name + ' override: ' + error.message +
              ' Update or reset that override before applying.');
          }
        }
    }
  }

  function definitionAffectedWidgetIds(segment, next) {
    const parameter = segment.kind === 'parameter' || next.kind === 'parameter',
      names = [segment.name, next.name],
      ids = new Set();
    for (const field of [...customAttributes, ...customMetrics]) {
      const formula = field.formula || field.caseExpr || '';
      if (!parameter && names.includes(field.lookmlName)) ids.add(field.id);
      if (parameter && names.some(name => new RegExp("PARAMETER\\(\\s*['\"]" + name +
          "['\"]\\s*\\)", 'i').test(formula))) ids.add(field.id);
    }
    const affected = new Set();
    for (const sheet of reportSheets)
      for (const widget of sheet.widgets || []) {
        const c = widget.config || {},
          fields = [...(c.xFields || []), ...(c.yFields || []), ...(c.filters || []).map(f => ({
            kind: 'dimension',
            id: f.dimension
          })), ...(c.dateFilters || []).map(f => ({
            kind: 'dimension',
            id: f.dimension
          })), ...[c.thresholdMetric, c.selectedMetric].filter(Boolean).map(id => ({
            kind: 'metric',
            id
          }))];
        if (fields.some(ref => {
            if (ids.has(ref.id)) return true;
            const field = (ref.kind === 'metric' ? customMetrics : customAttributes).find(f => f
              .id === ref.id);
            const d = ReportingTools.dependencies(field, customMetrics, customAttributes);
            return [...d.measures, ...d.dimensions].some(id => ids.has(id));
          })) affected.add(widget.id);
      }
    return affected;
  }

  function invalidateAppliedDefinition(affected) {
    definitionRevision++;
    for (const sheet of reportSheets)
      for (const widget of sheet.widgets || []) {
        if (affected.has(widget.id)) {
          widget.lastRunId = null;
          markWidgetStale(widget);
        } else {
          const snapshot = reportDisplaySnapshots.get(widget.id);
          if (snapshot) snapshot.revision = definitionRevision;
          if (widget.lastDefinitionRevision != null) widget.lastDefinitionRevision =
            definitionRevision;
        }
      }
  }

  function definitionIdentity(segment) {
    return (segment.kind === 'date' ? 'dimension' : segment.kind) + ':' + segment.name;
  }

  function applyIndividualDefinition(key) {
    collectDefinitionSource();
    const segment = dictionaryCardSegments.find(s => s.key === key),
      card = [...document.querySelectorAll('[data-definition-card]')].find(c => c.dataset
        .definitionCard === key),
      output = card?.querySelector('.definition-card-result');
    if (!segment || !output) return false;
    output.hidden = false;
    const priorParameters = reportParameters;
    try {
      const edited = splitDefinitionCards(segment.raw).filter(s => s.key);
      if (edited.length !== 1) throw Error('Each card must contain exactly one definition.');
      const next = edited[0];
      const committed = splitDefinitionCards(serializeLookmlDefinitions()),
        identity = definitionIdentity(segment);
      let replaced = false;
      const candidate = committed.map(block => {
        if (block.key && definitionIdentity(block) === identity) {
          replaced = true;
          return segment.raw;
        }
        return block.key ? block.raw : block.text;
      }).join('') + (replaced ? '' : '\n\n' + segment.raw);
      const resolved = resolveLookmlDefinitions(candidate);
      validateStoredParameterOverrides();
      const priorDimensions = customAttributes,
        priorMeasures = customMetrics;
      const oldField = (segment.kind === 'measure' ? priorMeasures : priorDimensions).find(
        field => field.lookmlName === segment.name);
      const nextField = (next.kind === 'measure' ? resolved.measures : resolved.dimensions).find(
        field => field.lookmlName === next.name);
      if (oldField && nextField && (segment.kind === 'measure') === (next.kind === 'measure'))
        nextField.id = oldField.id;
      const affected = definitionAffectedWidgetIds(segment, next);
      customAttributes = resolved.dimensions;
      customMetrics = resolved.measures;
      addDefinitionHistory(next.kind, next.name, 'Applied');
      rememberDefinitionVersion(serializeLookmlDefinitions());
      invalidateAppliedDefinition(affected);
      persistDefinitionHistory();
      persistDictionaryDraft($('definitionEditor').value);
      persistReporting();
      renderDictionary();
      renderDefinitionCardStack(next.name);
      renderSheet();
      const applied = dictionaryCardSegments.find(s => s.name === next.name && s.kind === next
          .kind),
        target = applied && document.querySelector(
          `[data-definition-card="${applied.key}"] .definition-card-result`);
      if (target) {
        target.hidden = false;
        target.textContent = 'Applied. Reporting definitions updated; refresh affected reports.';
        target.classList.remove('definition-apply-error');
      }
      $('definitionStatus').textContent = 'Applied ' + next.name +
        ' and saved in this browser. Other card drafts remain unapplied.';
      return true;
    } catch (error) {
      reportParameters = priorParameters;
      output.textContent = 'Apply failed: ' + error.message;
      output.classList.add('definition-apply-error');
      updateDefinitionCardStatus(card, {
        state: 'error',
        label: 'Error',
        message: error.message
      });
      return false;
    }
  }

  // Move the live controls rather than copies, preserving the selected module's configuration.
  let sidebarSetupOwner = null,
    sidebarMovedSections = [],
    sidebarOpenSections = new Map();
  const SIDEBAR_SETUP_SECTIONS = [
    ['filters', '[data-module-collapse="filters"]'],
    ['inspector', '.calculation-inspector'],
    ['configuration', '[data-module-collapse="configuration"]'],
    ['axes', '[data-module-collapse="axes"]']
  ];

  function restoreSidebarSetup() {
    for (const entry of sidebarMovedSections) {
      sidebarOpenSections.set(entry.key, entry.node.open);
      if (entry.marker.isConnected) entry.marker.replaceWith(entry.node);
      else entry.node.remove();
      if (entry.extra) {
        if (entry.extra.marker.isConnected) entry.extra.marker.replaceWith(entry.extra.node);
        else entry.extra.node.remove();
      }
    }
    sidebarMovedSections = [];
    const panel = $('moduleSidebarSetup');
    if (panel) {
      panel.hidden = true;
      panel.querySelector('.module-sidebar-context').replaceChildren();
    }
  }

  function renderSidebarSetup() {
    const panel = $('moduleSidebarSetup'),
      widget = activeSheet().widgets.find(w => w.id === selectedReportModuleId);
    if (!panel) return;
    if (!widget || widget.kind === 'placeholder' || $('reportingView').hidden || document.body
      .classList.contains('presentation-mode')) {
      restoreSidebarSetup();
      updateReportSetupLayout(false);
      return;
    }
    if (sidebarSetupOwner !== widget.id) {
      restoreSidebarSetup();
      sidebarOpenSections.clear();
      sidebarSetupOwner = widget.id;
    }
    panel.hidden = false;
    updateReportSetupLayout(true);
    panel.querySelector('[data-sidebar-module-title]').textContent = widget.name ||
      'Report module';
    const context = panel.querySelector('.module-sidebar-context');
    context.dataset.widgetId = widget.id;
    if (!sidebarMovedSections.length) {
      const source = widgetElement(widget.id);
      for (const [key, selector] of SIDEBAR_SETUP_SECTIONS) {
        const node = source.querySelector(':scope > ' + selector);
        if (!node) continue;
        const marker = document.createComment('Sidebar ' + key);
        node.before(marker);
        node.open = sidebarOpenSections.get(key) || false;
        context.append(node);
        const entry = {
          key,
          node,
          marker
        };
        if (key === 'axes') {
          const drill = source.querySelector(':scope > .module-date-drill');
          if (drill) {
            const marker = document.createComment('Sidebar date drill');
            drill.before(marker);
            node.append(drill);
            entry.extra = {
              node: drill,
              marker
            };
          }
        }
        sidebarMovedSections.push(entry);
      }
    }
    const inspector = context.querySelector('[data-calculation-inspector]');
    if (inspector) inspector.innerHTML = renderCalculationInspector(widget);
    // Use three-quarters of the former doubled height, sharing extra room among sections.
    if (!panel.style.getPropertyValue('--setup-section-extra')) {
      const sections = context.querySelectorAll(':scope > details');
      const baseHeight = panel.getBoundingClientRect().height;
      if (sections.length && baseHeight > 0) {
        panel.style.setProperty('--setup-panel-min-height', `${baseHeight*1.5}px`);
        panel.style.setProperty('--setup-section-extra', `${baseHeight*.5/sections.length}px`);
      }
    }
    updateReportSidebarPin();
  }

  function installModuleSidebarSetup() {
    const sidebar = document.querySelector('#reportingView .mockup3-report-sidebar'),
      dictionary = document.createElement('section');
    dictionary.className = 'card sidebar-dictionary-card';
    while (sidebar.firstChild) dictionary.append(sidebar.firstChild);
    sidebar.append(dictionary);
    sidebar.classList.add('sidebar-with-module-setup');
    sidebar.insertAdjacentHTML('beforeend',
      '<section id="moduleSidebarSetup" class="card" hidden><h2>Module Setup</h2><p class="report-note" data-sidebar-module-title></p><div class="field-palette-panel dictionary-tabs-panel"><div class="report-widget module-sidebar-context"></div></div></section>'
    );
    const panel = $('moduleSidebarSetup');
    observeFloatingToolbarBounds();
    // Feed the existing report event pipeline the original control target. This keeps drag/drop,
    // filter selection, keyboard autocomplete, and validation identical in the sidebar.
    for (const type of ['click', 'change', 'input', 'keydown', 'dragstart', 'dragover',
        'dragleave', 'dragend', 'drop', 'toggle'
      ]) panel.addEventListener(type, event => {
      event.__moduleSidebarControl = true;
      const forwarded = new Event(type, {
        bubbles: false,
        cancelable: true
      });
      Object.defineProperty(forwarded, 'target', {
        value: event.target
      });
      for (const key of ['dataTransfer', 'clientX', 'clientY', 'relatedTarget', 'key',
          'ctrlKey', 'metaKey', 'shiftKey', 'altKey'
        ])
        if (key in event) Object.defineProperty(forwarded, key, {
          value: event[key]
        });
      $('reportCharts').dispatchEvent(forwarded);
      if (forwarded.defaultPrevented) event.preventDefault();
    }, type === 'toggle');
    panel.addEventListener('focusin', () => {
      if (sidebarSetupOwner) selectReportModule(sidebarSetupOwner);
    });
  }

  let functionDictionaryVisible = false,
    functionDictionaryScroll = {
      definitions: 0,
      functions: 0
    };
  const FUNCTION_GUIDE = {
    EXTRACT: ['Dates', "EXTRACT(YEAR FROM '2026-11-25')",
      'Extracts YEAR, MONTH, DAY, WEEK, QUARTER, DOW or DOY using SQL syntax.'
    ],
    DATEPART: ['Dates', "DATEPART(MONTH, '2026-11-25')",
      'Date-part alias using an unquoted YEAR, MONTH, DAY, WEEK, WEEKDAY or QUARTER token.'
    ],
    DATE: ['Dates', "DATE('2026-11-25')", 'Converts a value to a local calendar date.'],
    TIMESTAMP: ['Dates', "TIMESTAMP('2026-11-25T12:00:00Z')",
      'Returns an ISO timestamp in UTC.'
    ],
    CURRENT_DATE: ['Dates', 'CURRENT_DATE()',
      'Returns today in the browser’s local time zone.'
    ],
    YEAR: ['Dates', "YEAR('2026-11-25')", 'Extracts the year.'],
    MONTH: ['Dates', "MONTH('2026-11-25')", 'Extracts month 1–12.'],
    DAY: ['Dates', "DAY('2026-11-25')", 'Extracts day of month.'],
    WEEKDAY: ['Dates', "WEEKDAY('2026-11-25')", 'Returns Sunday = 0 through Saturday = 6.'],
    WEEK: ['Dates', "WEEK('2026-11-25')",
      'Returns the engine’s Sunday-based week number; this is not ISO week numbering.'
    ],
    QUARTER: ['Dates', "QUARTER('2026-11-25')", 'Extracts quarter 1–4.'],
    DATE_TRUNC: ['Dates', "DATE_TRUNC('month', '2026-11-25')",
      'Returns the start of a day, week, month, quarter or year. Weeks start Monday.'
    ],
    DATEDIFF: ['Dates', "DATEDIFF('day', '2026-11-20', '2026-11-25')",
      'Returns end minus start in the specified unit. Two arguments default to days.'
    ],
    DATE_ADD: ['Dates', "DATE_ADD('2026-11-25', 7, 'day')",
      'Adds calendar days, weeks, months or years.'
    ],
    HOUR: ['Dates', "HOUR('2026-11-25T12:34:56')", 'Extracts the local hour.'],
    MINUTE: ['Dates', "MINUTE('2026-11-25T12:34:56')", 'Extracts minutes.'],
    SECOND: ['Dates', "SECOND('2026-11-25T12:34:56')", 'Extracts seconds.'],
    DAYOFYEAR: ['Dates', "DAYOFYEAR('2026-11-25')", 'Returns the day number within the year.'],
    DAYNAME: ['Dates', "DAYNAME('2026-11-25')", 'Returns the localized weekday name.'],
    MONTHNAME: ['Dates', "MONTHNAME('2026-11-25')", 'Returns the localized month name.'],
    CONCAT: ['Text', "CONCAT('New', ' ', 'York')", 'Joins text; NULL contributes empty text.'],
    LOWER: ['Text', "LOWER('ACTIVE')", 'Converts text to lowercase.'],
    UPPER: ['Text', "UPPER('active')", 'Converts text to uppercase.'],
    TRIM: ['Text', "TRIM('  active  ')", 'Removes surrounding whitespace.'],
    REGEXP_EXTRACT: ['Text', "REGEXP_EXTRACT('order-123', '([0-9]+)', 1)",
      'Extracts a regular-expression capture group; no match returns NULL.'
    ],
    SUBSTR: ['Text', "SUBSTR('subscription', 0, 3)",
      'Extracts text using a zero-based start and optional length.'
    ],
    LENGTH: ['Text', "LENGTH('active')", 'Returns text length.'],
    REPLACE: ['Text', "REPLACE('one-two', '-', ' ')",
      'Replaces every occurrence of the supplied text.'
    ],
    COALESCE: ['NULL handling', "COALESCE(NULL, '', 'fallback')",
      'Returns the first non-NULL, nonblank value.'
    ],
    NULLIF: ['NULL handling', 'NULLIF(5, 5)', 'Returns NULL when the two values are equal.'],
    SAFE_DIVIDE: ['NULL handling', 'SAFE_DIVIDE(10, 0)',
      'Divides safely; zero or missing denominators return NULL.'
    ],
    ABS: ['Numbers', 'ABS(-12.5)', 'Returns absolute value.'],
    ROUND: ['Numbers', 'ROUND(12.345, 2)', 'Rounds to the requested number of decimal places.'],
    FLOOR: ['Numbers', 'FLOOR(12.9)', 'Rounds down.'],
    CEIL: ['Numbers', 'CEIL(12.1)', 'Rounds up.'],
    MOD: ['Numbers', 'MOD(10, 3)', 'Returns the remainder.'],
    POWER: ['Numbers', 'POWER(2, 3)', 'Raises a number to a power.'],
    GREATEST: ['Numbers', 'GREATEST(2, 9, 4)', 'Returns the largest numeric argument.'],
    LEAST: ['Numbers', 'LEAST(2, 9, 4)', 'Returns the smallest numeric argument.'],
    COUNT_IF: ['Conditions', 'COUNT_IF(3 > 1)',
      'Returns a row contribution of 1 for true and 0 for false/NULL. Use sum to count matching records.'
    ]
  };

  function functionDictionaryEntries() {
    const entries = [...Object.keys(SQL_FUNCTIONS).filter(name => !name.startsWith('SQL_')),
      'EXTRACT', 'DATEPART'
    ].map(
      name => {
        const info = FUNCTION_GUIDE[name];
        return {
          name,
          category: info?.[0] || 'Other',
          example: info?.[1] || name + '()',
          description: info?.[2] || 'Supported expression function.',
          stage: 'Row'
        };
      });
    const operators = [
      ['CASE', 'CASE WHEN 3 > 2 THEN 1 ELSE 0 END', 'Choose a result by condition.'],
      ['+', '2 + 3', 'Add numbers.'],
      ['−', '7 - 2', 'Subtract numbers.'],
      ['×', '3 * 4', 'Multiply numbers.'],
      ['÷', '10 / 2', 'Divide numbers; a zero denominator returns NULL.'],
      ['%', '10 % 3', 'Remainder.'],
      ['Comparisons', '3 >= 2', 'Use =, !=, <>, <, <=, > or >=.'],
      ['AND', '3 > 2 AND 5 > 4', 'Both predicates must be true.'],
      ['OR', '3 > 4 OR 5 > 4', 'At least one predicate must be true.'],
      ['NOT', 'NOT (3 > 4)', 'Negate a predicate.'],
      ['IN', "'active' IN ('trial', 'active')", 'Match a list of values.'],
      ['NOT IN', "'cancelled' NOT IN ('trial', 'active')", 'Exclude a list of values.'],
      ['BETWEEN', '5 BETWEEN 1 AND 10', 'Inclusive lower and upper bounds.'],
      ['NOT BETWEEN', '15 NOT BETWEEN 1 AND 10', 'Outside inclusive bounds.'],
      ['LIKE', "'subscription' LIKE 'sub%'",
        'SQL text matching: % matches any sequence and _ matches one character.'
      ],
      ['NOT LIKE', "'subscription' NOT LIKE 'user%'", 'Negate a text match.'],
      ['IS NULL', 'NULL IS NULL', 'Test for missing values.'],
      ['IS NOT NULL', '5 IS NOT NULL', 'Test for a nonmissing value.'],
      ['NULL arithmetic', '1 + NULL', 'Missing inputs remain NULL rather than becoming zero.']
    ];
    entries.push(...operators.map(([name, example, description]) => ({
      name,
      example,
      description,
      category: 'Operators & CASE',
      stage: 'Row'
    })));
    for (const type of ['sum', 'count', 'count_distinct', 'avg', 'min', 'max']) entries.push({
      name: type.toUpperCase(),
      category: 'Aggregations',
      stage: 'Aggregate',
      example: `measure: example_${type} {\n  label: "Examples"\n  type: ${type}\n  sql: \${subscription_records.gross_revenue} ;;\n  value_format: numeric\n}`,
      description: ({
        sum: 'Adds filtered source-row values.',
        count: 'Counts non-NULL source-row values.',
        count_distinct: 'Counts unique non-NULL source-row values.',
        avg: 'Average (arithmetic mean) of filtered source-row values.',
        min: 'Smallest filtered source-row value.',
        max: 'Largest filtered source-row value.'
      })[type],
      sample: [10, 20, 30],
      aggregation: type
    });
    for (const type of ['table_sum', 'table_mean', 'table_avg', 'table_median', 'table_mode',
        'running_sum', 'running_difference_value', 'running_difference_percent',
        'previous_value', 'next_value'
      ])
      entries.push({
        name: type,
        category: 'Table calculations',
        stage: 'Report table',
        example: `measure: example_${type} {\n  label: "Examples"\n  type: ${type}\n  sql: {{base_measure}} ;;\n  table_mode: window\n  table_scope: visible\n  table_partition: all\n  # Optional: table_order: your_date asc\n}`,
        description: 'Calculated across report groups. Replace {{base_measure}} with an existing Dictionary measure. Partitions contain dimensions only. table_order: date_name asc controls calculation order independently of display sorting. Running sum excludes the current cell; missing neighbors and zero denominators return NULL.',
        sample: [10, 20, 30],
        aggregation: type
      });
    entries.push({
      name: 'Derived measure / number',
      category: 'References & parameters',
      stage: 'After aggregation',
      example: 'measure: example_rate {\n  type: number\n  sql: {{numerator_measure}} / {{denominator_measure}} ;;\n  value_format: percent\n}',
      description: 'Replace both measure placeholders with defined measures. Aggregate first, then divide; 3 / 10 = 30% with fraction-scale percent formatting.',
      output: 'Inputs 3 and 10 → 0.3 (30%)'
    }, {
      name: 'PARAMETER',
      category: 'References & parameters',
      stage: 'Parameter',
      example: "PARAMETER('parameter_name')",
      description: 'Replace parameter_name with a defined parameter. Uses the saved default or applicable instance value.',
      output: 'Example parameter default 5 → 5'
    }, {
      name: 'Field and definition references',
      category: 'References & parameters',
      stage: 'Reference',
      example: '${user_records.state}\n${defined_dimension}\n{{defined_measure}}',
      description: 'Physical field, defined dimension/date, and defined measure references. Replace the defined-name placeholders before applying.',
      output: 'Example state CA → "CA"'
    });
    return entries;
  }

  function functionExampleOutput(entry) {
    if (entry.stage === 'Row') {
      try {
        const value = evaluateExpression(entry.example, {});
        return value === null ? 'NULL' : JSON.stringify(value);
      } catch (error) {
        return 'Example error: ' + error.message;
      }
    }
    if (['running_sum', 'running_difference_value', 'running_difference_percent',
        'previous_value', 'next_value'
      ].includes(entry.aggregation)) return 'Inputs [10, 20, 30] → ' + JSON.stringify(({
      running_sum: [0, 10, 30],
      running_difference_value: [null, 10, 10],
      running_difference_percent: [null, 1, 0.5],
      previous_value: [null, 10, 20],
      next_value: [20, 30, null]
    })[entry.aggregation]);
    if (entry.aggregation) {
      const rows = entry.sample.map(value => ({
        value
      }));
      return 'Inputs [10, 20, 30] → ' + JSON.stringify(sampleAggregateValue(entry.aggregation,
        rows));
    }
    return entry.output;
  }

  function renderFunctionDictionary() {
    const host = $('functionDictionaryResults');
    if (!host) return;
    const query = $('functionDictionarySearch').value.trim().toLowerCase(),
      category = $('functionDictionaryCategory').value;
    const entries = functionDictionaryEntries(),
      filtered = entries.filter(e => (category === 'all' || e.category === category) && (!query ||
        [e.name, e.description, e.example, e.stage].join(' ').toLowerCase().includes(query)));
    $('functionDictionaryCount').textContent =
      `${filtered.length} of ${entries.length} functions and expression tools`;
    host.innerHTML = filtered.map(entry =>
      `<article class="function-reference-card"><div><h3>${htmlEscape(entry.name)}</h3><span>${htmlEscape(entry.category)} · ${htmlEscape(entry.stage)}</span></div><p>${htmlEscape(entry.description)}</p><pre><code>${htmlEscape(entry.example)}</code></pre><p class="function-output"><b>Result:</b> ${htmlEscape(functionExampleOutput(entry))}</p><button type="button" class="secondary" data-copy-function="${htmlEscape(entry.name)}">Copy Example</button></article>`
    ).join('') || '<p>No matching functions. Try another name or category.</p>';
  }

  function toggleFunctionDictionary() {
    const next = !functionDictionaryVisible;
    functionDictionaryScroll[functionDictionaryVisible ? 'functions' : 'definitions'] = scrollY;
    functionDictionaryVisible = next;
    const button = $('toggleFunctionDictionary');
    button.textContent = next ? 'Hide Functions' : 'Show Functions';
    button.setAttribute('aria-expanded', String(next));
    $('functionDictionary').hidden = !next;
    $('definitionCards').hidden = next;
    document.body.classList.toggle('definition-editor-open', !next && !!$('definitionCards')
      .querySelector('[data-definition-card][open]'));
    document.querySelectorAll('.definition-create-actions [data-create-definition]').forEach(el =>
      el.hidden = next);
    $('saveDefinitions').hidden = next;
    $('definitionStatus').hidden = next;
    document.querySelectorAll(
        '#dictionaryView > .relationship-card,#dictionaryView > .reporting-knowledge-card')
      .forEach(el => el.hidden = next);
    if (next) renderFunctionDictionary();
    window.scrollTo(0, functionDictionaryScroll[next ? 'functions' : 'definitions']);
  }

  function installFunctionDictionary() {
    const actions = document.querySelector('.definition-create-actions');
    actions.insertAdjacentHTML('afterbegin',
      '<button type="button" id="toggleFunctionDictionary" class="secondary" aria-expanded="false">Show Functions</button>'
    );
    $('definitionCardWorkspace').insertAdjacentHTML('beforeend',
      '<section id="functionDictionary" hidden><div class="function-reference-heading"><h2>Function Dictionary</h2><p>Examples use the Studio’s calculation engine. Row functions run before aggregation; aggregate measures summarize records; table calculations use report groups. Replace marked references before applying an example.</p></div><div class="function-reference-controls"><label>Search functions<input type="search" id="functionDictionarySearch" placeholder="Search names, syntax or purpose…"></label><label>Category<select id="functionDictionaryCategory"><option value="all">All categories</option></select></label><span id="functionDictionaryCount" role="status"></span></div><div id="functionDictionaryResults"></div><div class="function-copy-status" role="status" aria-live="polite"></div></section>'
    );
    const categories = [...new Set(functionDictionaryEntries().map(e => e.category))].sort();
    $('functionDictionaryCategory').insertAdjacentHTML('beforeend', categories.map(c =>
      `<option value="${htmlEscape(c)}">${htmlEscape(c)}</option>`).join(''));
    $('toggleFunctionDictionary').onclick = toggleFunctionDictionary;
    $('functionDictionarySearch').oninput = renderFunctionDictionary;
    $('functionDictionaryCategory').onchange = renderFunctionDictionary;
    $('functionDictionaryResults').onclick = async event => {
      const button = event.target.closest('[data-copy-function]');
      if (!button) return;
      const entry = functionDictionaryEntries().find(e => e.name === button.dataset
        .copyFunction);
      try {
        await navigator.clipboard.writeText(entry.example);
        $('functionDictionary').querySelector('.function-copy-status').textContent =
          'Example copied.';
      } catch {
        const area = document.createElement('textarea');
        area.value = entry.example;
        area.setAttribute('aria-label', 'Example to copy');
        button.after(area);
        area.select();
        $('functionDictionary').querySelector('.function-copy-status').textContent =
          'Select and copy the example below.';
      }
    };
  }

  installReportWorkspaceTools();
  installDefinitionAndModuleCards();
  installModuleSidebarSetup();
  installFunctionDictionary();
  loadReporting();
  restoreGeneratorSettings();
  $('saveInstance').addEventListener('click', saveStudioInstance);
  $('shareInstanceButton').addEventListener('click', shareStudioInstance);
  $('copyInstanceId').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('instanceShareCode').value);
      toast('Share code copied.')
    } catch {
      $('instanceShareCode').focus();
      $('instanceShareCode').select();
      toast('Select and copy the share code.')
    }
  });
  $('loadInstanceId').addEventListener('click', async () => {
    try {
      const code = $('instanceImportCode').value.trim();
      if (!code) throw new Error('Paste an Instance ID first.');
      await applyStudioInstance(decodeStudioInstance(code));
      $('shareInstanceDialog').close()
    } catch (error) {
      toast('Could not load that Instance ID: ' + error.message)
    }
  });
  $('loadInstanceButton').addEventListener('click', () => $('loadInstanceFile').click());
  $('loadInstanceFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadStudioInstance(file);
      persistGeneratorSettings()
    } catch (error) {
      console.error(error);
      toast('Load failed: ' + error.message)
    } finally {
      event.target.value = ''
    }
  });
  $('generate').addEventListener('click', () => {
    persistGeneratorSettings();
    make()
  });
  $('cancelGeneration').addEventListener('click', () => {
    generationCancelRequested = true;
    $('cancelGeneration').disabled = true;
    $('summaryText').textContent = 'Finishing the current batch before stopping…'
  });
  $('tableSelect').addEventListener('change', render);
  $('exportOptions').addEventListener('change', updateExportSelection);
  for (const id of ['userCount', 'historyDays', 'seed', 'distributionMode', 'optDiscount',
      'optFailures', 'optChanges', 'optCancels', 'optOneTime', 'optChargebacks'
    ]) $(id)?.addEventListener('change', persistGeneratorSettings);
  $('generatorTab').addEventListener('click', () => setReportView('generator'));
  $('dictionaryTab').addEventListener('click', () => setReportView('dictionary'));
  $('reportingTab').addEventListener('click', () => setReportView('reporting'));

  const definitionEditor = $('definitionEditor'),
    definitionEditorCard = definitionEditor.parentElement;
  definitionEditorCard.addEventListener('mousedown', event => {
    if (event.target.closest(
        '[data-code-suggestion],[data-show-dimension-values],[data-dimension-value]')) event
      .preventDefault()
  });
  definitionEditorCard.addEventListener('click', handleDictionaryAction);
  definitionEditor.addEventListener('input', event => {
    collectDefinitionSource();
    persistDictionaryDraft(event.target.value);
    renderCodeSuggestions(event.target)
  });
  definitionEditor.addEventListener('keyup', event => renderCodeSuggestions(event.target));
  definitionEditor.addEventListener('click', event => renderCodeSuggestions(event.target));
  definitionEditor.addEventListener('focusin', event => renderCodeSuggestions(event.target));
  $('saveDefinitions').addEventListener('click', saveLookmlDefinitions);
  $('previewDefinitionChanges').addEventListener('click', previewDefinitionChanges);
  $('evaluateDefinitions').addEventListener('click', evaluateDictionaryPreview);
  $('evaluationCode').addEventListener('input', event => {
    persistEvaluationDraft(event.target.value);
    const status = $('evaluationStatus');
    if (status) {
      status.textContent = 'Code changed. Evaluate the sample to refresh results.';
      status.className = 'evaluation-status'
    }
  });
  $('evaluationSampleCount').addEventListener('change', persistReporting);
  $('runReport').addEventListener('click', saveWidget);
  $('addPlaceholder').addEventListener('click', addPlaceholder);
  $('reportFieldPalette').addEventListener('toggle', () => updateReportSidebarPin(true), true);
  $('reportFieldSearch').addEventListener('input', applyReportFieldSearch);
  $('reportFieldPalette').addEventListener('dragstart', handleFieldDragStart);
  $('addReportSheet').addEventListener('click', addSheet);
  $('deleteReportSheet').addEventListener('click', deleteSheet);
  $('duplicateReportSheet').addEventListener('click', duplicateSheet);
  $('refreshAllReports').addEventListener('click', refreshActiveSheet);
  $('presentationMode').addEventListener('click', togglePresentation);
  $('presentationPrev').addEventListener('click', () => navigatePresentationSheet(-1));
  $('presentationNext').addEventListener('click', () => navigatePresentationSheet(1));
  $('exitPresentation').addEventListener('click', () => setPresentationMode(false));
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('presentation-mode')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setPresentationMode(false)
    } else if (event.key === 'ArrowLeft') navigatePresentationSheet(-1);
    else if (event.key === 'ArrowRight') navigatePresentationSheet(1)
  });
  $('reportSheetTabs').addEventListener('click', event => {
    const tab = event.target.closest('[data-sheet-id]');
    if (!tab) return;
    if (event.target.closest('[data-sheet-name-editor]')) {
      if (tab.dataset.sheetId !== activeSheetId) {
        activeSheetId = tab.dataset.sheetId;
        cancelWidgetEdit();
        persistReporting();
        renderSheet();
        requestAnimationFrame(() => {
          const editor = [...$('reportSheetTabs').querySelectorAll(
            '[data-sheet-name-editor]')].find(item => item.dataset.sheetNameEditor ===
            activeSheetId);
          editor?.focus()
        })
      }
      return
    }
    activeSheetId = tab.dataset.sheetId;
    cancelWidgetEdit();
    persistReporting();
    renderSheet()
  });
  $('reportSheetTabs').addEventListener('input', saveSheetName);
  $('reportSheetTabs').addEventListener('focusout', event => saveSheetName(event, true));
  $('reportSheetTabs').addEventListener('keydown', event => {
    if (!event.target.closest('[data-sheet-name-editor]')) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      event.target.blur()
    }
  });
  document.addEventListener('click', handleRefreshClick, true);
  $('reportCharts').addEventListener('pointerover', showReportTooltip);
  $('reportCharts').addEventListener('pointermove', moveReportTooltip);
  $('reportCharts').addEventListener('pointerout', event => {
    const next = event.relatedTarget instanceof Element ? event.relatedTarget.closest(
      '[data-chart-tooltip]') : null;
    if (next !== activeChartTooltipMark) hideReportTooltip()
  });
  $('reportCharts').addEventListener('click', handleReportCrossFilter);
  $('reportCharts').addEventListener('click', handleDateDrill);
  $('reportCharts').addEventListener('change', handleDateDrill);
  $('reportCharts').addEventListener('click', handleWidgetAction);
  $('reportCharts').addEventListener('toggle', saveModuleDisclosure, true);
  $('reportSidebarResizer').addEventListener('pointerdown', beginReportSidebarResize);
  document.addEventListener('pointermove', resizeReportSidebar);
  document.addEventListener('pointerup', finishReportSidebarResize);
  $('reportSidebarResizer').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    reportSidebarWidth += event.key === 'ArrowRight' ? 20 : -20;
    applyReportSidebarWidth(true);
    persistReporting()
  });
  $('reportCharts').addEventListener('change', event => {
    handleModuleSettingsChange(event);
    stageModuleDateRange(event);
    stageIndependentDateFilter(event);
    saveWidgetTitle(event)
  });
  installCompactSheetToolbar();
  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-palette-choice]');
    if (!choice) return;
    const select = choice.closest('.palette-control').querySelector(
      'select[data-module-setting="paletteId"]');
    select.value = choice.dataset.paletteChoice;
    select.dispatchEvent(new Event('change', {
      bubbles: true
    }));
  });
  $('reportCharts').addEventListener('pointerdown', startSurfaceDrag);
  document.addEventListener('pointermove', moveSurfaceDrag, {
    passive: false
  });
  document.addEventListener('pointerup', event => finishSurfaceDrag(event));
  document.addEventListener('pointercancel', event => finishSurfaceDrag(event, true));
  $('reportCharts').addEventListener('click', event => {
    if (suppressSurfaceClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  $('reportCharts').addEventListener('pointerdown', startWidgetResize);
  document.addEventListener('pointermove', resizeWidgetOnMove);
  document.addEventListener('pointerup', finishWidgetResize);
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-filter-picker]')) return;
    document.querySelectorAll('.filter-picker-menu:not([hidden])').forEach(menu => menu
      .hidden = true)
  });
  window.addEventListener('resize', () => {
    updateReportSidebarPin(true);
    if (document.body.classList.contains('reporting-active')) requestAnimationFrame(() =>
      updateReportSidebarPin(true));
    document.querySelectorAll('.filter-picker-menu:not([hidden])').forEach(menu => menu
      .hidden = true)
  });
  window.addEventListener('scroll', () => {
    updateReportSidebarPin();
    document.querySelectorAll('.filter-picker-menu:not([hidden])').forEach(menu => menu
      .hidden = true)
  }, true);
  $('reportCharts').addEventListener('click', event => {
    const button = event.target.closest('[data-filter-autofill]');
    if (button) completeFilterSearch(button);
  });
  $('reportCharts').addEventListener('keydown', event => {
    const tickInput = event.target.closest('[data-module-setting="tickInterval"]');
    if (tickInput && event.key === 'Enter') {
      event.preventDefault();
      if (tickInput.reportValidity()) tickInput.dispatchEvent(new Event('change', {
        bubbles: true
      }));
      return;
    }
    const focusedSuggestion = event.target.closest('[data-filter-autofill]');
    const search = event.target.closest('.filter-picker-search') || focusedSuggestion
      ?.closest('.filter-picker')?.querySelector('.filter-picker-search');
    if (!search) return;
    const list = search.closest('.filter-picker').querySelector(
      '.filter-autocomplete-suggestions');
    if (event.key === 'Escape' && list) {
      list.hidden = true;
      search.setAttribute('aria-expanded', 'false');
      search.focus();
    }
    if (focusedSuggestion && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const options = [...list.querySelectorAll('[data-filter-autofill]')],
        index = options.indexOf(focusedSuggestion);
      options[(index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length]
        ?.focus();
      return;
    }
    if (['Enter', 'ArrowDown'].includes(event.key) && list && !list.hidden) {
      event.preventDefault();
      const suggestion = list.querySelector('button');
      if (suggestion) event.key === 'Enter' ? completeFilterSearch(suggestion) : suggestion
        .focus();
    }
  });
  $('reportCharts').addEventListener('input', event => {
    const search = event.target.closest('.filter-picker-search');
    if (search) {
      updateFilterAutocomplete(search);

    }
  });
  $('reportCharts').addEventListener('dragstart', handleFieldDragStart);
  $('reportCharts').addEventListener('dragover', event => {
    if (previewReportGridDrop(event)) return;
    const axis = event.target.closest('[data-drop-axis]');
    if (axis || event.target.closest('.report-widget') || event.currentTarget === event
      .target) event.preventDefault();
    if (axis) {
      clearAxisDropMarkers();
      const pill = event.target.closest('[data-axis-field]');
      if (pill) {
        const rect = pill.getBoundingClientRect();
        pill.classList.add(event.clientX > rect.left + rect.width / 2 ? 'drag-over-after' :
          'drag-over-before')
      }
    }
  });
  $('reportCharts').addEventListener('dragleave', event => {
    if (event.target === event.currentTarget || !event.currentTarget.contains(event
        .relatedTarget)) clearAxisDropMarkers()
  });
  $('reportCharts').addEventListener('dragend', () => {
    clearAxisDropMarkers();
    clearGridPlacementPreview();
    draggedReportModuleId = null;
  });
  $('reportCharts').addEventListener('drop', event => {
    if (draggedReportModuleId || event.dataTransfer?.getData('application/x-widget-id')) {
      handleModuleDrop(event);
      return;
    }
    if (event.target.closest('[data-module-datefilterdrop]')) handleModuleDateFilterDrop(
      event);
    else if (event.target.closest('[data-module-filterdrop]')) handleModuleFilterDrop(event);
    else handleModuleDrop(event)
  });
  initializeReporting();
  $('downloadCsv').addEventListener('click', async () => {
    if (!tables) return;
    const keys = [...document.querySelectorAll('#exportOptions input:checked')].map(b => b
      .value);
    if (!keys.length) return;
    if (!window.showDirectoryPicker) {
      if (keys.some(key => !tables[key].parts)) {
        toast('Large CSV exports need Chrome or Edge to select a folder.');
        return
      }
      keys.forEach((key, index) => setTimeout(() => downloadTableCsv(key), index * 250));
      $('summaryText').textContent =
        `Prepared ${keys.length} selected CSV files for download.`;
      return
    }
    try {
      const dir = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      $('downloadCsv').disabled = true;
      $('tableSelect').disabled = true;
      const summary = [];
      for (const key of keys) {
        const meta = tables[key],
          handle = await dir.getFileHandle(key + '.csv', {
            create: true
          });
        if (meta.parts) {
          const writable = await handle.createWritable();
          await writable.write(meta.parts.join('\r\n'));
          await writable.close()
        } else await streamCsv(key, handle);
        summary.push({
          table: key,
          rows: meta.count
        })
      }
      const manifest = await dir.getFileHandle('export_manifest.json', {
          create: true
        }),
        writer = await manifest.createWritable();
      await writer.write(JSON.stringify({
        exportedAt: new Date().toISOString(),
        seed: appState?.masterSeed ?? null,
        users: appState?.count ?? null,
        tables: summary
      }, null, 2));
      await writer.close();
      $('summaryText').textContent =
        `Exported ${summary.length} CSV tables (${summary.reduce((n,row)=>n+row.rows,0).toLocaleString()} rows) and export_manifest.json.`
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e);
        toast('CSV export failed: ' + (e.message || 'unknown error'))
      }
    } finally {
      $('tableSelect').disabled = false;
      updateExportSelection()
    }
  });
  $('downloadJson').addEventListener('click', () => {
    if (!tables) return;
    const json = {};
    for (const [key] of TABLES) json[key] = tables[key].jsonRows || [];
    download('synthetic_subscription_dataset.json', JSON.stringify(json, null, 2),
      'application/json')
  });
  void restoreProjectDictionaryFile().finally(() => setTimeout(() => {
    let savedRun = null;
    try {
      savedRun = JSON.parse(localStorage.getItem('syntheticGeneratorLastRun') || 'null')
    } catch {}
    const defaults = window.__SUBSCRIPTION_STUDIO_DEFAULTS__;
    make(savedRun || (!hadStoredWorkspace ? defaults?.generator?.run : null))
  }, 80));
})();
