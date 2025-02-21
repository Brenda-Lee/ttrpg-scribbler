'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import StarterKit from '@tiptap/starter-kit'
import { createLowlight, all } from 'lowlight'
import html from 'highlight.js/lib/languages/xml'
import { RxFontBold, RxFontItalic, RxStretchVertically, RxStrikethrough} from 'react-icons/rx'

const lowlight = createLowlight(all)

lowlight.register('html', html)

export default function Editor() {
    const editor = useEditor({
        extensions: [
            StarterKit,
            CodeBlockLowlight.configure({
                lowlight,
            }),
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
                className='max-w-[789px] mx-auto pt-16'
                editor={editor}
            />
            { editor && (
                <BubbleMenu className='bg-zinc-700 shadow-xl border border-zinc-800 shadow-black/28 rounded-lg overflow-hidden flex divide-x divide-zinc-680' editor={editor}>
                    <button className='p-2 text-zinc-300 text-sm flex items-center gap-1.5 font-medium leading-none hover:text-zinc-50 hover:bg-zinc-600'>
                        <RxFontBold className='w-3 h-3'/>
                    </button>
                    <button className='p-2 text-zinc-300 text-sm flex items-center gap-1.5 font-medium leading-none hover:text-zinc-50 hover:bg-zinc-600'>
                        <RxFontItalic className='w-3 h-3'/>
                    </button>
                    <button className='p-2 text-zinc-300 text-sm flex items-center gap-1.5 font-medium leading-none hover:text-zinc-50 hover:bg-zinc-600'>
                        <RxStretchVertically className='w-3 h-3'/>Uppercase
                    </button>
                    <button className='p-2 text-zinc-300 text-sm flex items-center gap-1.5 font-medium leading-none hover:text-zinc-50 hover:bg-zinc-600'>
                        <RxFontBold className='w-3 h-3'/>Underscore
                    </button>
                </BubbleMenu>
            )}
        </>
    )
}