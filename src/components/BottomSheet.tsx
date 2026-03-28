import { Drawer, Modal, ScrollArea } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import type { ReactNode } from 'react'

interface BottomSheetProps {
  opened: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  size?: string
}

export function BottomSheet({ opened, onClose, title, children, size = 'lg' }: BottomSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        title={title}
        position="bottom"
        size="92%"
        radius="16px 16px 0 0"
        scrollAreaComponent={ScrollArea.Autosize}
        styles={{
          header: {
            paddingTop: 12,
            paddingBottom: 8,
            borderBottom: '1px solid #ecefe3',
          },
          title: {
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 700,
            fontSize: 17,
            color: '#191d16',
          },
          body: {
            paddingTop: 16,
            paddingBottom: 24,
          },
          content: {
            borderRadius: '16px 16px 0 0',
          },
          overlay: {
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        {children}
      </Drawer>
    )
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      radius="md"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      {children}
    </Modal>
  )
}
