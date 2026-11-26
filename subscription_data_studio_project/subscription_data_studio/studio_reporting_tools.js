// Pure reporting utilities shared by the page and background calculation worker.
function createReportingTools() {
  const grains = {
    user_records: 'one user',
    subscription_records: 'one subscription',
    transaction_records: 'one captured transaction',
    scheduled_subscription_payment_records: 'one scheduled payment',
    subscription_change_records: 'one subscription change',
    failed_transactions: 'one failed attempt',
    marketing_records: 'one campaign per day'
  };
  const joins = {
    user_records: ['user_records'],
    subscription_records: ['subscription_records', 'user_records'],
    transaction_records: ['transaction_records', 'subscription_records', 'user_records'],
    scheduled_subscription_payment_records: ['scheduled_subscription_payment_records',
      'subscription_records', 'user_records', 'transaction_records'
    ],
    subscription_change_records: ['subscription_change_records', 'subscription_records',
      'user_records'
    ],
    failed_transactions: ['failed_transactions', 'subscription_records', 'user_records'],
    marketing_records: ['marketing_records']
  };
  const identityFields = {
    user_records: ['user_id'],
    subscription_records: ['subscription_id'],
    transaction_records: ['transaction_id'],
    scheduled_subscription_payment_records: ['scheduled_payment_id'],
    subscription_change_records: ['subscription_change_id'],
    failed_transactions: ['failed_transaction_id'],
    marketing_records: ['date', 'campaign_source', 'campaign_name'],
    user_lifetime: ['user_id']
  };

  function recordIdentity(table, rowMap) {
    const fields = identityFields[table],
      row = rowMap[table] || (table === 'user_lifetime' ? rowMap.user_records : null);
    if (!fields || !row || fields.some(field => row[field] == null || row[field] === ''))
      throw Error(`Cannot total ${table}: a source record ID is missing.`);
    if (fields.length > 1) return JSON.stringify(fields.map(field => row[field]));
    const value = row[fields[0]];
    return Number.isFinite(Number(value)) ? Number(value) : String(value);
  }
  const numeric = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null :
    Number(value);

  function divide(a, b) {
    const numerator = numeric(a),
      denominator = numeric(b);
    return numerator == null || denominator == null || denominator === 0 ? null : numeric(
      numerator / denominator);
  }

  function arithmetic(operation, a, b) {
    const left = numeric(a),
      right = numeric(b);
    if (left == null || right == null) return null;
    if (operation === 'add') return numeric(left + right);
    if (operation === 'subtract') return numeric(left - right);
    if (operation === 'multiply') return numeric(left * right);
    if (operation === 'divide') return divide(left, right);
    return right === 0 ? null : numeric(left % right);
  }

  function compare(operation, a, b) {
    if (a == null || b == null) return null;
    switch (operation) {
      case '==':
      case '===':
        return a == b;
      case '!=':
      case '!==':
        return a != b;
      case '<':
        return a < b;
      case '<=':
        return a <= b;
      case '>':
        return a > b;
      case '>=':
        return a >= b
    }
    return null
  }

  function logic(operation, a, b) {
    if (operation === 'not') return a == null ? null : !a;
    if (operation === 'and') {
      if (a === false || b === false) return false;
      return a == null || b == null ? null : !!a && !!b
    }
    if (a === true || b === true) return true;
    return a == null || b == null ? null : !!a || !!b
  }

  function compileNullSafeExpression(source) {
    const tokens = String(source).match(
      /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|===|!==|==|!=|<=|>=|&&|\|\||[()+\-*/%<>,!?:]/g
    ) || [];
    if (tokens.join('') !== String(source).replace(/\s+(?=(?:[^"']|"[^"]*"|'[^']*')*$)/g, '')) {
      // Token offsets below perform the authoritative check while respecting spaces inside strings.
      let cursor = 0;
      for (const token of tokens) {
        while (/\s/.test(source[cursor] || '') && cursor < source.length) cursor++;
        if (source.slice(cursor, cursor + token.length) !== token) throw Error(
          'Unsupported expression syntax');
        cursor += token.length
      }
      if (source.slice(cursor).trim()) throw Error('Unsupported expression syntax');
    }
    let index = 0;
    const precedence = {
        '||': 1,
        '&&': 2,
        '==': 3,
        '!=': 3,
        '===': 3,
        '!==': 3,
        '<': 4,
        '<=': 4,
        '>': 4,
        '>=': 4,
        '+': 5,
        '-': 5,
        '*': 6,
        '/': 6,
        '%': 6
      },
      helpers = {
        '+': 'SQL_ADD',
        '-': 'SQL_SUBTRACT',
        '*': 'SQL_MULTIPLY',
        '/': 'SQL_DIVIDE',
        '%': 'SQL_MOD'
      };

    function atom() {
      const token = tokens[index++];
      if (token == null) throw Error('Incomplete expression');
      if (token === '(') {
        const value = expression(0);
        if (tokens[index++] !== ')') throw Error('Unclosed expression');
        return '(' + value + ')'
      }
      if (['!', '+', '-'].includes(token)) {
        const value = atom();
        return token === '!' ? 'SQL_NOT(' + value + ')' : token === '-' ? 'SQL_SUBTRACT(0,' +
          value + ')' : 'SQL_MULTIPLY(1,' + value + ')'
      }
      if (!/^(?:[A-Za-z_]\w*|\d|\.\d|"|')/.test(token)) throw Error('Unexpected expression token ' +
        token);
      if (tokens[index] === '(') {
        index++;
        const args = [];
        if (tokens[index] !== ')') {
          do {
            args.push(expression(0));
            if (tokens[index] !== ',') break;
            index++
          } while (true)
        }
        if (tokens[index++] !== ')') throw Error('Unclosed function arguments');
        return token + '(' + args.join(',') + ')'
      }
      return token
    }

    function expression(minimum) {
      let left = atom();
      while (precedence[tokens[index]] >= minimum) {
        const operator = tokens[index++],
          right = expression(precedence[operator] + 1);
        left = helpers[operator] ? helpers[operator] + '(' + left + ',' + right + ')' : operator ===
          '&&' ? 'SQL_AND(' + left + ',' + right + ')' : operator === '||' ? 'SQL_OR(' + left +
          ',' + right + ')' : 'SQL_COMPARE(' + JSON.stringify(operator) + ',' + left + ',' + right +
          ')'
      }
      if (minimum === 0 && tokens[index] === '?') {
        index++;
        const yes = expression(0);
        if (tokens[index++] !== ':') throw Error('Invalid CASE expression');
        const no = expression(0);
        left = '(' + left + '?' + yes + ':' + no + ')'
      }
      return left
    }
    const compiled = expression(0);
    if (index !== tokens.length) throw Error('Unexpected expression token ' + tokens[index]);
    return compiled;
  }

  function numericFunction(name, values) {
    const numbers = values.map(numeric);
    if (numbers.some(value => value == null)) return null;
    const [a, b] = numbers;
    let result;
    switch (name) {
      case 'ABS':
        result = Math.abs(a);
        break;
      case 'ROUND': {
        const scale = 10 ** (b ?? 0);
        result = Math.round(a * scale) / scale;
        break
      }
      case 'FLOOR':
        result = Math.floor(a);
        break;
      case 'CEIL':
        result = Math.ceil(a);
        break;
      case 'MOD':
        result = b === 0 ? null : a % b;
        break;
      case 'POWER':
        result = Math.pow(a, b);
        break;
      case 'GREATEST':
        result = Math.max(...numbers);
        break;
      case 'LEAST':
        result = Math.min(...numbers);
        break
    }
    return numeric(result);
  }

  function dependencies(item, measures, dimensions, seen = new Set()) {
    if (!item || seen.has(item.id)) return {
      columns: [],
      measures: [],
      dimensions: [],
      cycle: !!item
    };
    const next = new Set(seen).add(item.id),
      columns = item.source ? [item.source] : [],
      measureIds = [],
      dimensionIds = [...(item.tablePartitionFields || []), ...(item.tableOrderFields || []).map(
        field => field.id)];
    const expression = item.formula || item.caseExpr || '';
    for (const match of expression.matchAll(/\[([\w]+)\.([\w]+)\]/g)) columns.push(match[1] + '.' +
      match[2]);
    for (const match of expression.matchAll(/\[dimension:([\w]+)\]/g)) {
      const dimension = dimensions.find(value => value.lookmlName === match[1] || value.id ===
        match[1]);
      if (dimension) dimensionIds.push(dimension.id);
    }
    for (const match of expression.matchAll(/\{\{([^}]+)\}\}/g)) {
      const measure = measures.find(value => value.id === match[1].trim() || value.lookmlName ===
        match[1].trim());
      if (measure) measureIds.push(measure.id);
    }
    if (item.kind === 'ratio') measureIds.push(item.numerator, item.denominator);
    let cycle = false;
    for (const id of [...measureIds, ...dimensionIds]) {
      const result = dependencies([...measures, ...dimensions].find(value => value.id === id),
        measures, dimensions, next);
      columns.push(...result.columns);
      measureIds.push(...result.measures.filter(value => !measureIds.includes(value)));
      dimensionIds.push(...result.dimensions.filter(value => !dimensionIds.includes(value)));
      cycle ||= result.cycle;
    }
    return {
      columns: [...new Set(columns)],
      measures: [...new Set(measureIds)],
      dimensions: [...new Set(dimensionIds)],
      cycle
    };
  }

  function lineage(item, measures, dimensions) {
    const refs = dependencies(item, measures, dimensions),
      tables = [...new Set(refs.columns.map(ref => ref.split('.')[0]))];
    const expression = item.formula || '',
      aggregateExpression = item.kind === 'ratio' || (!/\[[\w]+\.[\w]+\]|\[dimension:/.test(
        expression) && /\{\{/.test(expression));
    const fact = aggregateExpression ? null : item.factTable || tables[0] || 'user_records';
    const errors = [],
      warnings = [];
    if (fact && tables.some(table => table !== fact)) warnings.push(
      'Parent-table values repeat at ' + (grains[fact] || fact) +
      ' grain; aggregate parent totals separately when needed.');
    if (fact)
      for (const table of tables)
        if (!(joins[fact] || []).includes(table)) errors.push(
          `${table} is not available from ${fact}. Define separate measures and combine their aggregates instead.`
        );
    if (refs.cycle) errors.push('Circular dependency.');
    return {
      ...refs,
      tables,
      fact,
      grain: fact ? grains[fact] || fact : 'aggregate of measure dependencies',
      aggregation: item.tableMode === 'window' ?
        `${item.aggregation} over ${item.tablePartition} (${item.tableScope})` : item.aggregation ||
        'dimension value',
      errors,
      warnings
    };
  }

  function statistic(values, operation) {
    const data = values.map(numeric).filter(value => value != null);
    if (!data.length) return null;
    const total = data.reduce((sum, value) => sum + value, 0);
    if (operation === 'table_sum') return total;
    if (operation === 'table_mean' || operation === 'table_avg') return total / data.length;
    data.sort((a, b) => a - b);
    if (operation === 'table_median') {
      const mid = Math.floor(data.length / 2);
      return data.length % 2 ? data[mid] : (data[mid - 1] + data[mid]) / 2;
    }
    const frequencies = new Map();
    for (const value of data) frequencies.set(value, (frequencies.get(value) || 0) + 1);
    let best = data[0],
      count = 0;
    for (const [value, frequency] of frequencies)
      if (frequency > count) {
        best = value;
        count = frequency;
      }
    return best;
  }

  function definitionDiff(before, after) {
    const left = new Map(before.map(block => [block.kind + ':' + block.id, block])),
      right = new Map(after.map(block => [block.kind + ':' + block.id, block]));
    return [...new Set([...left.keys(), ...right.keys()])].flatMap(key => {
      const old = left.get(key),
        next = right.get(key);
      if (old?.raw === next?.raw) return [];
      return [{
        key,
        name: next?.id || old.id,
        action: !old ? 'Added' : !next ? 'Removed' : 'Changed',
        before: old?.raw || '',
        after: next?.raw || ''
      }];
    });
  }
  const glossary = [
    ['User vs subscription',
      'One user can own several subscriptions over time. Count distinct user_id for people and subscription_id for subscriptions.'
    ],
    ['Charged vs recognized revenue',
      'Transactions represent captured charges and adjustments. Recognized revenue requires an explicit service-period allocation model; it is not automatically produced.'
    ],
    ['Cohort vs event date',
      'A cohort date selects who started in a period. An event date selects activity occurring in a period. They can use different ranges.'
    ],
    ['Weighted average',
      'Combine underlying sums and counts. Averaging the displayed group averages gives equal weight to differently sized groups.'
    ],
    ['NULL vs zero',
      'NULL means missing or undefined. Zero is a measured value. Division by zero returns NULL, displayed as an em dash.'
    ],
    ['Percent scale',
      'New percentage definitions use fractions: 0.10 displays as 10%. Existing point-scale definitions retain their display until explicitly migrated.'
    ],
    ['Table partitions',
      'Series windows aggregate across categories within each measure/series; category windows aggregate across series at a category; all combines the selected measure’s partitions.'
    ]
  ];
  return {
    grains,
    joins,
    identityFields,
    recordIdentity,
    numeric,
    divide,
    numericFunction,
    arithmetic,
    compare,
    logic,
    compileNullSafeExpression,
    dependencies,
    lineage,
    statistic,
    definitionDiff,
    glossary
  };
}
