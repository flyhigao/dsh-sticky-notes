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

    var NOTE_ICON_DATA_URI = 'data:image/png;base64,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';

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
        icon: React.createElement('img', { src: NOTE_ICON_DATA_URI, width: 18, height: 18, alt: '', style: { display: 'block' } }),
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
