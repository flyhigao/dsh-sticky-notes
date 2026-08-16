/* dsh-sticky-notes browser half.
 *
 * Hand-written lazy-CJS bundle for DSH's client module loader.
 * It registers a compact note icon in the current conversation header and
 * opens a DSH-styled workspace notes panel.
 */
window.__ModuleLoader__.load({
  id: 'dsh-sticky-notes',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var React = require('react');
    var createPortal = require('react-dom').createPortal;
    var primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    var Button = primitives.Button;
    var Input = primitives.Input;
    var Modal = primitives.Modal;
    var IconPlusOutline16 = primitives.IconPlusOutline16;
    var IconTrashOutline16 = primitives.IconTrashOutline16;

    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="dsh-sticky-notes"]') === null) {
      var styleTag = document.createElement('style');
      styleTag.setAttribute('data-plugin', 'dsh-sticky-notes');
      styleTag.setAttribute('data-plugin-css', 'dsh-sticky-notes');
      styleTag.textContent = '.dsh-sticky-notes-modal{width:min(860px,calc(100vw - 48px))!important;max-width:none!important}';
      document.head.appendChild(styleTag);
    }

    var useState = React.useState;
    var useEffect = React.useEffect;
    var useMemo = React.useMemo;
    var useRef = React.useRef;

    var NS = 'dsh-sticky-notes';

    var zh = {
      nav: '便签',
      title: '工作区便签',
      subtitle: '保存在当前工作区的 dsh-notes/ 目录',
      newNote: '新建便签',
      titlePlaceholder: '便签标题',
      contentPlaceholder: '写下你的想法…',
      save: '保存',
      saving: '保存中…',
      delete: '删除',
      deleteConfirm: '确定删除这张便签吗？',
      saved: '已保存',
      deleted: '已删除',
      loading: '加载中…',
      noWorkspace: '还没有可用的工作区，请先打开或创建一个工作区。',
      empty: '还没有便签，点击「新建便签」开始记录。',
      close: '关闭',
      untitled: '未命名便签',
    };

    var en = {
      nav: 'Notes',
      title: 'Workspace Notes',
      subtitle: 'Stored in the current workspace dsh-notes/ directory',
      newNote: 'New note',
      titlePlaceholder: 'Note title',
      contentPlaceholder: 'Write your thoughts…',
      save: 'Save',
      saving: 'Saving…',
      delete: 'Delete',
      deleteConfirm: 'Delete this note?',
      saved: 'Saved',
      deleted: 'Deleted',
      loading: 'Loading…',
      noWorkspace: 'No workspace available yet. Open or create a workspace first.',
      empty: 'No notes yet. Click “New note” to start.',
      close: 'Close',
      untitled: 'Untitled',
    };

    function currentWorkspace(sessions, workspaces) {
      sessions = sessions || { current: undefined, byId: {} };
      workspaces = workspaces || { items: [] };
      var current = sessions.current !== undefined ? sessions.byId[sessions.current] : undefined;
      if (current && current.cwd) {
        var byPath = workspaces.items.find(function (w) { return w.path === current.cwd; });
        if (byPath) return byPath;
      }
      if (workspaces.recentWorkspaceId) {
        var recent = workspaces.items.find(function (w) { return w.workspaceId === workspaces.recentWorkspaceId; });
        if (recent) return recent;
      }
      return workspaces.items[0] || undefined;
    }

    async function parseResponse(response) {
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        throw new Error(data && data.error ? data.error : ('HTTP ' + response.status));
      }
      return data;
    }

    function fetchList(workspaceId) {
      return fetch('/dsh-sticky-notes/list?workspaceId=' + encodeURIComponent(workspaceId), {
        headers: { 'accept': 'application/json' },
      }).then(parseResponse);
    }

    function fetchSave(workspaceId, note) {
      return fetch('/dsh-sticky-notes/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspaceId, note: note }),
      }).then(parseResponse);
    }

    function fetchDelete(workspaceId, id) {
      return fetch('/dsh-sticky-notes/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspaceId, id: id }),
      }).then(parseResponse);
    }

    function formatTime(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      var pad = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function NoteFishIcon(props) {
      var size = props.size || 18;
      return React.createElement('svg', {
        width: size,
        height: size,
        viewBox: '10 4 44 52',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        React.createElement('path', {
          d: 'M14 8h30a6 6 0 0 1 6 6v22l-14 14H20a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z',
          fill: 'none',
          stroke: 'currentColor',
        }),
        React.createElement('path', {
          d: 'M50 36h-8a4 4 0 0 0-4 4v8l12-12z',
          fill: 'currentColor',
          stroke: 'none',
        }),
        React.createElement('path', {
          d: 'M24 34c0-8 8-12 14-10 5 2 8 6 8 10s-3 8-8 9c-6 1-14-1-14-9z',
          fill: 'none',
          stroke: 'currentColor',
        }),
        React.createElement('path', {
          d: 'M31 24l4-7 3 8z',
          fill: 'none',
          stroke: 'currentColor',
        }),
        React.createElement('path', {
          d: 'M24 34l-8-5 4 5-4 5 8-5z',
          fill: 'none',
          stroke: 'currentColor',
        }),
        React.createElement('path', {
          d: 'M33 38l6 3-5 3z',
          fill: 'none',
          stroke: 'currentColor',
        }),
        React.createElement('circle', {
          cx: 40,
          cy: 28,
          r: 1.5,
          fill: 'currentColor',
          stroke: 'none',
        })
      );
    }

    function StickyNotesButton(props) {
      var t = props.t;
      if (!t) {
        t = function (key) { return zh[key] || en[key] || key; };
      }
      var useSessions = props.useSessions;
      var useWorkspaces = props.useWorkspaces;

      var sessions = typeof useSessions === 'function'
        ? useSessions(function (s) { return s; })
        : { current: undefined, byId: {}, ids: [], phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined };
      var workspaces = typeof useWorkspaces === 'function'
        ? useWorkspaces(function (s) { return s; })
        : { items: [], archivedSessionIds: [], state: 'ready', phase: 'ready', error: null, baselinesReady: true, recentWorkspaceId: undefined };
      var workspace = useMemo(function () { return currentWorkspace(sessions, workspaces); }, [sessions, workspaces]);
      var workspaceKey = workspace ? workspace.workspaceId : '';
      var tRef = useRef(t);
      tRef.current = t;

      var _a = useState(false);
      var open = _a[0];
      var setOpen = _a[1];

      var _b = useState([]);
      var notes = _b[0];
      var setNotes = _b[1];

      var _c = useState(null);
      var selectedId = _c[0];
      var setSelectedId = _c[1];

      var _d = useState('');
      var title = _d[0];
      var setTitle = _d[1];

      var _e = useState('');
      var content = _e[0];
      var setContent = _e[1];

      var _f = useState(false);
      var loading = _f[0];
      var setLoading = _f[1];

      var _g = useState(false);
      var saving = _g[0];
      var setSaving = _g[1];

      var _h = useState('');
      var error = _h[0];
      var setError = _h[1];

      var _i = useState('');
      var status = _i[0];
      var setStatus = _i[1];

      useEffect(function () {
        if (!open) return;
        var cancelled = false;
        if (!workspace) {
          setNotes([]);
          setSelectedId(null);
          setTitle('');
          setContent('');
          setError(tRef.current('noWorkspace'));
          setLoading(false);
          return;
        }
        setLoading(true);
        setError('');
        setStatus('');
        fetchList(workspace.workspaceId).then(function (data) {
          if (cancelled) return;
          setNotes(data.notes || []);
          var first = (data.notes || [])[0];
          setSelectedId(first ? first.id : null);
          setTitle(first ? first.title : '');
          setContent(first ? first.content : '');
          setLoading(false);
        }).catch(function (err) {
          if (cancelled) return;
          setError(err && err.message ? err.message : String(err));
          setLoading(false);
        });
        return function () { cancelled = true; };
      }, [open, workspaceKey]);

      function selectNote(id) {
        var note = notes.find(function (n) { return n.id === id; });
        if (!note) return;
        setSelectedId(id);
        setTitle(note.title);
        setContent(note.content);
        setError('');
        setStatus('');
      }

      function newNote() {
        setSelectedId(null);
        setTitle('');
        setContent('');
        setError('');
        setStatus('');
      }

      async function handleSave() {
        if (!workspace) return;
        setSaving(true);
        setError('');
        setStatus('');
        try {
          var data = await fetchSave(workspace.workspaceId, {
            id: selectedId || undefined,
            title: title,
            content: content,
          });
          var note = data.note;
          setNotes(function (prev) {
            var exists = prev.some(function (n) { return n.id === note.id; });
            var next = exists ? prev.map(function (n) { return n.id === note.id ? note : n; }) : [note].concat(prev);
            return next.sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
          });
          setSelectedId(note.id);
          setTitle(note.title);
          setContent(note.content);
          setStatus(t('saved'));
        } catch (err) {
          setError(err && err.message ? err.message : String(err));
        } finally {
          setSaving(false);
        }
      }

      async function handleDelete() {
        if (!workspace || !selectedId) return;
        if (!window.confirm(t('deleteConfirm'))) return;
        setSaving(true);
        setError('');
        setStatus('');
        try {
          await fetchDelete(workspace.workspaceId, selectedId);
          setNotes(function (prev) { return prev.filter(function (n) { return n.id !== selectedId; }); });
          setSelectedId(null);
          setTitle('');
          setContent('');
          setStatus(t('deleted'));
        } catch (err) {
          setError(err && err.message ? err.message : String(err));
        } finally {
          setSaving(false);
        }
      }

      var headerButton = React.createElement(Button, {
        variant: 'ghost',
        size: 'sm',
        icon: React.createElement(NoteFishIcon, { size: 18 }),
        title: t('nav'),
        'aria-label': t('nav'),
        onClick: function () { setOpen(!open); },
      });

      if (!open) return headerButton;

      var bodyStyle = {
        display: 'flex',
        gap: '16px',
        minHeight: '480px',
      };

      var listStyle = {
        width: '200px',
        flexShrink: 0,
        borderRight: '1px solid var(--dsw-alias-border-l1, #e5e7eb)',
        paddingRight: '12px',
        maxHeight: '50vh',
        overflowY: 'auto',
      };

      var editorStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        gap: '10px',
      };

      var listItemStyle = function (note) {
        return {
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '10px 12px',
          marginBottom: '6px',
          borderRadius: '8px',
          cursor: 'pointer',
          font: 'inherit',
          color: 'var(--dsw-alias-label-primary, #1f2328)',
          background: note.id === selectedId ? 'var(--dsw-alias-interactive-bg-hover, #eef2ff)' : 'transparent',
          border: '1px solid ' + (note.id === selectedId ? 'var(--dsw-alias-brand-primary, #4f6ef7)' : 'transparent'),
        };
      };

      var noteList = notes.map(function (note) {
        return React.createElement('button', {
          key: note.id,
          type: 'button',
          onClick: function () { selectNote(note.id); },
          style: listItemStyle(note),
        },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 13 } }, note.title || t('untitled')),
          React.createElement('div', {
            style: {
              fontSize: 12,
              color: 'var(--dsw-alias-label-tertiary, #9ca3af)',
              marginTop: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }, note.content || ''),
          React.createElement('div', {
            style: {
              fontSize: 11,
              color: 'var(--dsw-alias-label-tertiary, #9ca3af)',
              marginTop: 4,
            },
          }, formatTime(note.updatedAt))
        );
      });

      var editor;
      if (loading) {
        editor = React.createElement('div', { style: { color: 'var(--dsw-alias-label-tertiary, #9ca3af)' } }, t('loading'));
      } else {
        editor = React.createElement(React.Fragment, null,
          React.createElement(Input, {
            value: title,
            placeholder: t('titlePlaceholder'),
            onChange: function (e) { setTitle(e.target.value); },
            style: {
              width: '100%',
              boxSizing: 'border-box',
            },
          }),
          React.createElement('textarea', {
            value: content,
            placeholder: t('contentPlaceholder'),
            onChange: function (e) { setContent(e.target.value); },
            style: {
              flex: 1,
              width: '100%',
              boxSizing: 'border-box',
              resize: 'none',
              padding: '12px',
              border: '1px solid var(--dsw-alias-border-l1, #e5e7eb)',
              borderRadius: '8px',
              background: 'var(--dsw-alias-bg-base, #ffffff)',
              color: 'var(--dsw-alias-label-primary, #1f2328)',
              font: 'inherit',
              lineHeight: 1.6,
            },
          }),
          error ? React.createElement('div', { style: { color: '#e5484d', fontSize: 13 } }, error) : null,
          status ? React.createElement('div', { style: { color: '#30a46c', fontSize: 13 } }, status) : null
        );
      }

      var footer = React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
        React.createElement(Button, {
          variant: 'outline',
          size: 'md',
          icon: React.createElement(IconPlusOutline16, { size: 16 }),
          onClick: newNote,
        }, t('newNote')),
        selectedId ? React.createElement(Button, {
          variant: 'outline',
          size: 'md',
          icon: React.createElement(IconTrashOutline16, { size: 16 }),
          disabled: saving,
          onClick: handleDelete,
        }, t('delete')) : null,
        React.createElement(Button, {
          variant: 'primary',
          size: 'md',
          disabled: saving,
          onClick: handleSave,
        }, saving ? t('saving') : t('save'))
      );

      return React.createElement(Modal, {
        open: open,
        onClose: function () { setOpen(false); },
        className: 'dsh-sticky-notes-modal',
        title: t('title'),
        description: t('subtitle'),
        closeLabel: t('close'),
        footer: footer,
        children: React.createElement('div', { style: bodyStyle },
          React.createElement('div', { style: listStyle },
            notes.length === 0 && !loading
              ? React.createElement('div', { style: { color: 'var(--dsw-alias-label-tertiary, #9ca3af)', fontSize: 13 } }, t('empty'))
              : noteList
          ),
          React.createElement('div', { style: editorStyle }, editor)
        ),
      });
    }

    function apply(ctx) {
      ctx.effect(function () {
        return ctx.locale.register(NS, { zh: zh, en: en });
      }, 'dsh-sticky-notes: dictionaries');

      var t = ctx.locale.bind(NS);

      // Only in the current conversation header, not in the sidebar footer.
      ctx.slots.inject('conversation.session.header.actions', function () {
        return ctx.slots.register({
          name: 'conversation.session.header.actions',
          id: 'sticky-notes',
          order: 20,
          label: function () { return t('nav'); },
          locale: NS,
          inject: function () { return { t: t }; },
        }, StickyNotesButton);
      });
    }

    exports.name = 'dsh-sticky-notes';
    exports.inject = ['slots', 'locale'];
    exports.apply = apply;

    return module.exports;
  }
});
