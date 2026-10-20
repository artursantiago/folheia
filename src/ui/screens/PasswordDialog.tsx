import { useState, type FormEvent } from 'react';
import { Button, Dialog, Icon, IconButton, TextField } from '../components';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import { passwordRequest } from '../session';
import styles from './PasswordDialog.module.css';

export function PasswordDialog() {
  const { t } = useI18n();
  const request = useStore(passwordRequest);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);

  if (!request) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    request.respond(password);
    setPassword('');
  };
  const cancel = () => {
    request.respond(null);
    setPassword('');
  };

  return (
    <Dialog
      open
      title={t('password.title')}
      label={t('password.label')}
      meta={<Icon name="lock" />}
      onClose={cancel}
      width="md"
    >
      <form onSubmit={submit} className={styles.form}>
        <p className={styles.title}>{t('password.title')}</p>
        <p className={styles.body}>{t('password.body', { name: request.name })}</p>
        <TextField
          label={t('password.field')}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={request.reason === 'incorrect' ? t('password.incorrect') : undefined}
          trailing={
            <IconButton
              icon="eye"
              label={visible ? t('password.hide') : t('password.show')}
              pressed={visible}
              onClick={() => setVisible(!visible)}
            />
          }
        />
        <p className={styles.note}>{t('password.note')}</p>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" className={styles.grow}>
            {t('password.submit')}
          </Button>
          <Button onClick={cancel}>{t('reader.back')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
