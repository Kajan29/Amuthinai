import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from './ui/Button';
import { Input } from './ui/Input';

import { colors, radius, spacing, typography } from '@/theme';
import type { ChatMessage } from '@/types';
import { formatTime } from '@/utils/date';

interface ChatLogProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSend: (body: string) => Promise<void>;
}

/** In-app communication log attached to a donation — kept for dispute resolution. */
export function ChatLog({ messages, currentUserId, onSend }: ChatLogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;

    setIsSending(true);
    try {
      await onSend(body);
      setDraft('');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.wrapper}
    >
      <FlatList
        data={messages}
        keyExtractor={(message) => message.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMine = item.senderId === currentUserId;

          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              {!isMine && <Text style={styles.sender}>{item.senderRole}</Text>}
              <Text style={[styles.body, isMine && styles.bodyMine]}>{item.body}</Text>
              <Text style={[styles.time, isMine && styles.timeMine]}>
                {formatTime(item.sentAt)}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <Input
          label=""
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message"
          multiline
        />
        <Button label={t('common.submit')} onPress={handleSend} loading={isSending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, gap: spacing.md },
  list: { gap: spacing.sm, padding: spacing.sm },
  bubble: { borderRadius: radius.lg, gap: 2, maxWidth: '85%', padding: spacing.md },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  sender: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  body: { ...typography.body, color: colors.text },
  bodyMine: { color: colors.textInverse },
  time: { ...typography.caption, color: colors.textMuted },
  timeMine: { color: colors.primaryLight },
  composer: { gap: spacing.sm },
});
