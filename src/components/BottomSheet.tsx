import { Drawer, Modal, ScrollArea, Box, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import type { ReactNode } from 'react'

interface BottomSheetProps {
  opened: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  size?: string
}

function DragHandle({ title }: { title?: ReactNode }) {
  return (
    <Box style={{ width: '100%' }}>
      <Box
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          background: '#c5ccb8',
          margin: '0 auto 8px',
        }}
      />
      {title && (
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 700,
            fontSize: 17,
            color: '#191d16',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      )}
    </Box>
  )
}

export function BottomSheet({ opened, onClose, title, children, size = 'lg' }: BottomSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        title={<DragHandle title={title} />}
        position="bottom"
        size="auto"
        radius="16px 16px 0 0"
        withCloseButton={false}
        styles={{
          header: {
            paddingTop: 10,
            paddingBottom: 8,
            borderBottom: '1px solid #ecefe3',
            flexShrink: 0,
          },
          title: {
            width: '100%',
          },
          body: {
            paddingTop: 16,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
          },
          content: {
            borderRadius: '16px 16px 0 0',
            maxHeight: '92dvh',
            display: 'flex',
            flexDirection: 'column',
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
