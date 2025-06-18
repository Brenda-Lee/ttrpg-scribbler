"use client"

import {
    useEditor,
    EditorContent,
    BubbleMenu,
    FloatingMenu
} from '@tiptap/react'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { createLowlight, all } from 'lowlight'
import html from 'highlight.js/lib/languages/xml'
import { 
    RxFontBold,
    RxFontItalic,
    RxStretchVertically,
    RxStrikethrough,
    RxChevronDown,
    RxChatBubble
} from 'react-icons/rx'
import { BubbleButton } from './BubbleButton'

const lowlight = createLowlight(all)

lowlight.register('html', html)

export default function Editor() {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Underline.configure({
              HTMLAttributes: {
                class: 'my-custom-class',
              },
            })
        ],
        content: '<p>Hello World! 🌎️</p>',
        editorProps: {
            attributes: {
                class: 'outline-none',
            }
        }
    })

    if (!editor) {
        return null
    }

    return (
        <>
            <EditorContent 
                className='max-w-[789px] mx-auto pt-16 bg-zinc-100'
                editor={editor}
            />
            { editor && (
                <FloatingMenu
                    editor={editor}
                    shouldShow={() => {
                        return true
                    }}>
                    Bold
                </FloatingMenu>
            )}
            { editor && (
                <BubbleMenu editor={editor} className='bg-zinc-700 shadow-xl border border-zinc-800 shadow-black/28 rounded-lg overflow-hidden flex divide-x divide-zinc-680'>
                    <BubbleButton>
                        Texto
                        <RxChevronDown className='w-3 h-3'/>
                    </BubbleButton>
                    <BubbleButton>
                        Comentário
                        <RxChatBubble className='w-3 h-3'/>
                    </BubbleButton>
                    <div className='flex items-center'>
                        <BubbleButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            data-active={editor.isActive('bold')}>
                            <RxFontBold className='w-3 h-3'/>
                        </BubbleButton>
                        <BubbleButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            data-active={editor.isActive('italic')}>
                            <RxFontItalic className='w-3 h-3'/>
                        </BubbleButton>
                        <BubbleButton
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            data-active={editor.isActive('strike')}>
                            {/* Uppercase */}
                            <RxStretchVertically className='w-3 h-3'/>
                        </BubbleButton>
                        <BubbleButton
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            data-active={editor.isActive('underline')}>
                            {/* Underscore */}
                            <RxStrikethrough className='w-3 h-3'/>
                        </BubbleButton>
                    </div>
                </BubbleMenu>
            )}
        </>
    )
}