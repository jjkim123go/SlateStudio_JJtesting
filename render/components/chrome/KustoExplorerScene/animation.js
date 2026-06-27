// Intent: glass - precise Kusto query surface for technical classification work.
(function () {
  if (typeof gsap === 'undefined' || typeof master === 'undefined') return;

  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .kx-root');
  if (!root) return;

  var props = SCENE_PROPS || {};
  var MAT = {
    enter: { duration: 0.4, ease: 'power2.out' },
    exit: { duration: 0.28, ease: 'power2.in' },
    stagger: 0.08,
    distance: 20
  };

  function asArray(value, fallback) {
    return Array.isArray(value) && value.length ? value : fallback;
  }

  function text(value, fallback) {
    return String(value == null || value === '' ? fallback : value);
  }

  function defaultConnections() {
    return [
      { name: 'Connections', type: 'root', depth: 0, expanded: true },
      { name: 'MockControlsCluster', detail: 'https://mock-controls-cluster.example.kusto.windows.net', type: 'cluster', depth: 1, expanded: true },
      { name: 'mock_revenueops', type: 'database', depth: 2, expanded: false },
      { name: 'mock_billingplan', type: 'database', depth: 2, expanded: false },
      { name: 'mock_controls', type: 'database', depth: 2, expanded: true, selected: true },
      { name: 'Functions', type: 'folder', depth: 3, expanded: false },
      { name: 'Tables', type: 'folder', depth: 3, expanded: true },
      { name: 'BdrOrphanedRecognitions', type: 'table', depth: 3 },
      { name: 'OrderToBillingPlanMock', type: 'table', depth: 3 },
      { name: 'AssetSignalSnapshot', type: 'table', depth: 3 },
      { name: 'GoldenKeyHealth', type: 'table', depth: 3 },
      { name: 'LedgerEventTrace', type: 'table', depth: 3 },
      { name: 'MfbMaskedEarlyWarning', type: 'table', depth: 3 }
    ];
  }

  function defaultQueryLines() {
    return [
      "cluster('mock-controls-cluster.example.kusto.windows.net').database('mock_controls').BdrOrphanedRecognitions",
      '| summarize RecognitionAmountUSD = sum(RecognitionAmountUSD) by OrderID, GoldenKeyID',
      "| join kind=leftouter (OrderToBillingPlanMock | project BillingPlanId, AssetState, GkState) on $left.OrderID == $right.BillingPlanId",
      '| extend Classification = case(',
      "    AssetState in ('Cancelled', 'PriorFYEnded'), 'Dunning/business carve-out',",
      "    GkState != 'available' or MissingOrderTick == true, 'Known sync issue',",
      "    isempty(BillingPlanId), 'Not in MS Sales BP',",
      "    'Actual Horizon')",
      '| summarize Orders=count(), RecognitionUSD=sum(RecognitionAmountUSD) by Classification'
    ];
  }

  function defaultResults() {
    return {
      columns: ['Classification', 'Orders', 'RecognitionUSD', 'Treatment', 'OwnerRoute'],
      rows: [
        ['Dunning/business carve-out', '184', '$2.8M', 'Exclude / carve out', 'Controls'],
        ['Known sync issue', '37', '$910K', 'Route to sync owners', 'MS Sales / Order sync'],
        ['Not in MS Sales BP', '16', '$420K', 'Investigate ingestion / ID mismatch', 'MS Sales baseline'],
        ['Actual Horizon', '8', '$287K', 'Ledger trace', 'Horizon investigation'],
        ['MFB-masked orphan', '24', '$610K', 'Early warning', 'Monthly monitor']
      ]
    };
  }

  function iconFor(type) {
    if (type === 'cluster') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 4.5C2 3.1 4.7 2 8 2s6 1.1 6 2.5v7C14 12.9 11.3 14 8 14s-6-1.1-6-2.5v-7Zm1.4.1C3.8 5.2 5.6 5.9 8 5.9s4.2-.7 4.6-1.3C12.2 4 10.4 3.3 8 3.3S3.8 4 3.4 4.6Z"/></svg>';
    if (type === 'database') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 4c0-1.1 2.2-2 5-2s5 .9 5 2v8c0 1.1-2.2 2-5 2s-5-.9-5-2V4Zm1.2 2v2c.9.6 2.2.9 3.8.9s2.9-.3 3.8-.9V6c-.9.6-2.2.9-3.8.9S5.1 6.6 4.2 6Z"/></svg>';
    if (type === 'table') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 3h12v10H2V3Zm1.2 1.2v2h3v-2h-3Zm4.2 0v2h5.4v-2H7.4Zm-4.2 3.2v1.8h3V7.4h-3Zm4.2 0v1.8h5.4V7.4H7.4Zm-4.2 3v1.4h3v-1.4h-3Zm4.2 0v1.4h5.4v-1.4H7.4Z"/></svg>';
    if (type === 'folder') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 4h4l1 1h7v7H2V4Z"/></svg>';
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2 14 5.5v5L8 14l-6-3.5v-5L8 2Z"/></svg>';
  }

  function renderTree() {
    var tree = root.querySelector('.kx-tree');
    var rows = asArray(props.connections, defaultConnections());
    tree.innerHTML = '';
    rows.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'kx-tree-row' + (item.selected ? ' kx-selected' : '');
      row.setAttribute('data-depth', String(item.depth || 0));
      row.setAttribute('data-name', text(item.name, 'MockNode'));

      var twist = document.createElement('span');
      twist.className = 'kx-twist';
      twist.textContent = item.expanded ? 'v' : (item.type === 'table' ? '' : '>');
      row.appendChild(twist);

      var icon = document.createElement('span');
      icon.className = 'kx-icon';
      icon.innerHTML = iconFor(item.type);
      row.appendChild(icon);

      var label = document.createElement('span');
      label.className = 'kx-tree-name';
      label.textContent = text(item.name, 'MockNode');
      row.appendChild(label);
      tree.appendChild(row);
    });
  }

  function renderTabs() {
    var host = root.querySelector('.kx-query-tabs');
    var tabs = asArray(props.tabs, [
      { title: 'MockControlsCluster.mock_controls', active: true },
      { title: 'MockBillingPlan.baseline' },
      { title: 'LedgerTrace.samples' }
    ]);
    host.innerHTML = '';
    tabs.forEach(function (tab) {
      var node = document.createElement('div');
      node.className = 'kx-query-tab' + (tab.active ? ' kx-tab-active' : '');
      node.textContent = text(tab.title, 'Mock query');
      host.appendChild(node);
    });
  }

  function classifyToken(token) {
    if (/^(cluster|database|sum|count|case|isempty)$/i.test(token)) return 'kx-fn';
    if (/^(join|kind|leftouter|project|summarize|by|where|extend|on|in|or|and)$/i.test(token.replace(/[|]/g, ''))) return 'kx-kw';
    if (/^'.*'$/.test(token)) return 'kx-str';
    if (/^\d+(\.\d+)?$/.test(token)) return 'kx-num';
    if (/^(RecognitionAmountUSD|OrderID|GoldenKeyID|BillingPlanId|AssetState|GkState|MissingOrderTick|Classification)$/i.test(token.replace(/[,()]/g, ''))) return 'kx-ident';
    return '';
  }

  function syntaxLine(line) {
    if (line.trim().startsWith('//')) {
      return '<span class="kx-comment"></span>';
    }
    return line.split(/(\s+|[(),=])/).map(function (part) {
      if (!part) return '';
      if (/^\s+$/.test(part)) return part.replace(/ /g, '&nbsp;');
      var cls = classifyToken(part);
      var escaped = part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return cls ? '<span class="' + cls + '">' + escaped + '</span>' : escaped;
    }).join('');
  }

  function renderQuery() {
    var linesHost = root.querySelector('.kx-lines');
    var codeHost = root.querySelector('.kx-code');
    var queryLines = asArray(props.queryLines, defaultQueryLines());
    linesHost.innerHTML = '';
    codeHost.innerHTML = '';
    queryLines.forEach(function (line, index) {
      var lineNo = document.createElement('div');
      lineNo.className = 'kx-line-no';
      lineNo.textContent = String(index + 1);
      linesHost.appendChild(lineNo);

      var codeLine = document.createElement('div');
      codeLine.className = 'kx-code-line';
      codeLine.setAttribute('data-line', String(index + 1));
      codeLine.innerHTML = syntaxLine(text(line, ''));
      codeHost.appendChild(codeLine);
    });

    var address = root.querySelector('.kx-address');
    address.textContent = text(props.address, "cluster('mock-controls-cluster.example.kusto.windows.net').database('mock_controls')");
  }

  function renderResults() {
    var data = props.results && Array.isArray(props.results.columns) ? props.results : defaultResults();
    var thead = root.querySelector('.kx-table thead');
    var tbody = root.querySelector('.kx-table tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    var headRow = document.createElement('tr');
    data.columns.forEach(function (col) {
      var th = document.createElement('th');
      th.textContent = text(col, 'Column');
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    (Array.isArray(data.rows) ? data.rows : []).forEach(function (row) {
      var tr = document.createElement('tr');
      row.forEach(function (cell) {
        var td = document.createElement('td');
        td.textContent = text(cell, '');
        if (/^\$|USD|\d+\.\d/.test(String(cell))) td.className = 'kx-amount';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    var rowCount = root.querySelector('.kx-row-count');
    rowCount.textContent = String((data.rows || []).length) + ' records';
    var requestId = root.querySelector('.kx-request-id');
    requestId.textContent = text(props.requestId, 'KE.Mock.QueryId/7a1d8c4');
  }

  function renderCallout() {
    var callout = props.callout || {};
    root.querySelector('.kx-callout-eyebrow').textContent = text(callout.eyebrow, 'Mock KQL Workspace');
    root.querySelector('.kx-callout-title').textContent = text(callout.title, 'Classify before routing');
    root.querySelector('.kx-callout-body').textContent = text(callout.body, 'Query, join, attach signals, and route the final bucket from one governed workspace.');
  }

  renderTree();
  renderTabs();
  renderQuery();
  renderResults();
  renderCallout();

  var windowEl = root.querySelector('.kx-window');
  var runner = root.querySelector('.kx-runner');
  var selectedTree = root.querySelector('.kx-tree-row.kx-selected');
  var resultRows = root.querySelectorAll('.kx-table tbody tr');
  var calloutEl = root.querySelector('.kx-callout');
  var activeLines = Array.isArray(props.highlightLines) && props.highlightLines.length ? props.highlightLines : [1, 3, 4, 8, 9];

  gsap.set(S + ' .kx-ribbon-group, ' + S + ' .kx-query-tab, ' + S + ' .kx-tree-row, ' + S + ' .kx-code-line, ' + S + ' .kx-table tbody tr', { autoAlpha: 0 });
  gsap.set(calloutEl, { autoAlpha: 0, y: 16, scale: 0.98 });

  master.fromTo(windowEl,
    { autoAlpha: 0, y: 20, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.58, ease: 'power3.out' },
    SCENE_START + 0.12);

  master.to(S + ' .kx-ribbon-group', { autoAlpha: 1, y: 0, duration: MAT.enter.duration, ease: MAT.enter.ease, stagger: 0.05 }, SCENE_START + 0.38);
  master.to(S + ' .kx-query-tab', { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out', stagger: 0.04 }, SCENE_START + 0.58);
  master.to(S + ' .kx-tree-row', { autoAlpha: 1, x: 0, duration: 0.22, ease: 'power2.out', stagger: 0.025 }, SCENE_START + 0.72);
  master.to(S + ' .kx-code-line', { autoAlpha: 1, x: 0, duration: 0.2, ease: 'power1.out', stagger: 0.035 }, SCENE_START + 0.92);

  if (selectedTree) {
    master.fromTo(selectedTree, { scale: 0.995 }, { scale: 1.018, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out' }, SCENE_START + Math.min(2.1, SCENE_DURATION * 0.2));
  }

  activeLines.forEach(function (lineNo, index) {
    var line = root.querySelector('.kx-code-line[data-line="' + lineNo + '"]');
    if (!line) return;
    master.call(function () {
      root.querySelectorAll('.kx-code-line').forEach(function (node) { node.classList.remove('kx-line-active'); });
      line.classList.add('kx-line-active');
    }, [], SCENE_START + 1.7 + index * 0.45);
  });

  master.fromTo(runner,
    { autoAlpha: 0, y: 10, scale: 0.96 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.26, ease: 'power2.out' },
    SCENE_START + Math.min(4.4, SCENE_DURATION * 0.34));
  master.to(S + ' .kx-spinner', { rotation: 360, duration: 0.7, ease: 'none', repeat: 2 }, SCENE_START + Math.min(4.45, SCENE_DURATION * 0.34));
  master.to(runner, { autoAlpha: 0, y: -6, duration: 0.22, ease: 'power1.in' }, SCENE_START + Math.min(6.0, SCENE_DURATION * 0.46));

  master.to(S + ' .kx-table tbody tr', { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger: 0.07 }, SCENE_START + Math.min(5.7, SCENE_DURATION * 0.44));
  if (resultRows.length) {
    master.to(resultRows[Math.min(3, resultRows.length - 1)], { backgroundColor: '#fff7df', duration: 0.32, ease: 'power1.out', yoyo: true, repeat: 1 }, SCENE_START + Math.min(7.2, SCENE_DURATION * 0.55));
  }

  master.fromTo(calloutEl,
    { autoAlpha: 0, y: 16, scale: 0.98 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power2.out' },
    SCENE_START + Math.min(7.8, SCENE_DURATION * 0.6));

  master.to(windowEl, { autoAlpha: 0, duration: MAT.exit.duration, ease: MAT.exit.ease }, SCENE_START + Math.max(0.5, SCENE_DURATION - 0.34));
})();
