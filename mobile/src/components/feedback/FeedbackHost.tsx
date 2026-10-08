import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { FeedbackDialog, type FeedbackTone } from './FeedbackDialog';
import { SavingCard } from './SavingCard';

export type DialogState = { tone: FeedbackTone; title: string; message?: string; actionLabel: string };

type Props = { loaderLabel: string | null; dialog: DialogState | null; onCloseDialog: () => void };

// One Modal switches between loader and dialog: iOS won't present a second Modal while the first is dismissing.
export function FeedbackHost({ loaderLabel, dialog, onCloseDialog }: Props) {
  const visible = !!loaderLabel || !!dialog;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dialog ? onCloseDialog : () => {}}>
      <View style={styles.backdrop}>
        {dialog ? <FeedbackDialog {...dialog} onClose={onCloseDialog} /> : loaderLabel ? <SavingCard label={loaderLabel} /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
});
