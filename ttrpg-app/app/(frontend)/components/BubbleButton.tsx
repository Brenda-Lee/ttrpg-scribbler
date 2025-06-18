import { Component, ComponentProps, ReactNode } from 'react'

export interface BubbleButtonProps extends ComponentProps<'button'> {
  children: ReactNode
}

export function BubbleButton(props: BubbleButtonProps) {
  return (
    <button
        className='p-2 text-zinc-300 text-sm flex items-center gap-1.5 font-medium leading-none hover:text-zinc-50 hover:bg-zinc-600 data-[active=true]:text-violet-400'  
        {...props}
    />
  )
}