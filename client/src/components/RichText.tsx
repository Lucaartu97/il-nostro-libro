import { Placeholder } from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, type LucideIcon, Quote } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextProps {
  /** Contenuto iniziale: il componente va rimontato (key) per sostituirlo. */
  initialHtml: string;
  onChange: (html: string) => void;
  editable: boolean;
  placeholder: string;
}

/** Il foglio su cui si scrive: testo a mano con la formattazione essenziale. */
export function RichText({ initialHtml, onChange, editable, placeholder }: RichTextProps) {
  const editor = useEditor({
    extensions: [
      // Solo ciò che il libro sa conservare (vedi la lista dei tag ammessi sul server).
      StarterKit.configure({ heading: false, code: false, codeBlock: false, horizontalRule: false, link: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    editable,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'prose-hand', 'aria-label': 'Il testo della pagina' } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  const tools: { label: string; icon: LucideIcon; active: boolean; run: () => void }[] = [
    { label: 'Grassetto', icon: Bold, active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { label: 'Corsivo', icon: Italic, active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    {
      label: 'Elenco puntato',
      icon: List,
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Elenco numerato',
      icon: ListOrdered,
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Citazione',
      icon: Quote,
      active: editor.isActive('blockquote'),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <div>
      <div className="sticky top-[4.2rem] z-10 mb-3 flex w-fit gap-0.5 rounded-full border border-line bg-paper p-1 shadow-sm" role="toolbar" aria-label="Formattazione">
        {tools.map(({ label, icon: Icon, active, run }) => (
          <button
            key={label}
            type="button"
            // mousedown e non click: il testo selezionato non deve perdere il fuoco.
            onMouseDown={(e) => {
              e.preventDefault();
              run();
            }}
            disabled={!editable}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={`grid h-10 w-10 place-items-center rounded-full transition-colors disabled:opacity-40 ${
              active ? 'bg-accent text-on-accent' : 'text-ink-soft hover:bg-accent-soft hover:text-accent-deep'
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
