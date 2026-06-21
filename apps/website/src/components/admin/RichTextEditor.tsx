'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { MediaPicker } from './MediaPicker'

const toolbarBtn = (active: boolean): React.CSSProperties => ({
  border: '1px solid ' + (active ? '#1a6d3e' : '#d9e0d7'),
  background: active ? '#e8f2ec' : '#fff',
  color: active ? '#1a6d3e' : '#3a4339',
  borderRadius: 6, padding: '5px 9px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', lineHeight: 1.2,
})

/**
 * WYSIWYG editor for article/page body — replaces hand-typed raw HTML.
 * Outputs plain HTML (editor.getHTML()) so it's a drop-in replacement for
 * the existing <textarea value={body}> wherever body is stored/rendered as
 * an HTML string (articles.body, pages.content). Image toolbar button opens
 * the shared MediaPicker (browse DO Spaces library / upload / paste URL)
 * and inserts the chosen image inline at the cursor.
 */
export function RichTextEditor({ value, onChange, minHeight = 360 }: {
  value: string
  onChange: (html: string) => void
  minHeight?: number
}) {
  const [mediaOpen, setMediaOpen] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { style: 'max-width:100%;border-radius:8px;' } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) return null

  const Btn = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} title={title} style={toolbarBtn(!!active)}>{children}</button>
  )

  return (
    <div style={{ border: '1.5px solid #d9e0d7', borderRadius: 8, overflow: 'hidden', background: '#fbfcfa' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, borderBottom: '1px solid #eef1ed', background: '#fff' }}>
        <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></Btn>
        <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></Btn>
        <span style={{ width: 1, background: '#eef1ed', margin: '2px 4px' }} />
        <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
        <Btn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
        <Btn title="Paragraph" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>¶</Btn>
        <span style={{ width: 1, background: '#eef1ed', margin: '2px 4px' }} />
        <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
        <Btn title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>" Quote</Btn>
        <span style={{ width: 1, background: '#eef1ed', margin: '2px 4px' }} />
        <Btn
          title="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('Link URL (leave blank to remove)', editor.getAttributes('link').href || '')
            if (url === null) return
            if (!url.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run()
            else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
          }}>
          🔗 Link
        </Btn>
        <Btn title="Insert image" onClick={() => setMediaOpen(true)}>🖼 Image</Btn>
        <span style={{ flex: 1 }} />
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}>↶</Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}>↷</Btn>
      </div>

      {/* Editable area */}
      <div style={{ padding: '12px 14px', minHeight, fontSize: 14, lineHeight: 1.6 }}>
        <EditorContent editor={editor} />
      </div>

      <MediaPicker
        open={mediaOpen}
        onSelect={(url) => { setMediaOpen(false); editor.chain().focus().setImage({ src: url }).run() }}
        onClose={() => setMediaOpen(false)}
      />
    </div>
  )
}
