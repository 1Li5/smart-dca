import { useState } from 'react';
import { Alert, Button, Form, Input, Modal, Tabs, Typography } from 'antd';
import { LockOutlined, UserOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

type Mode = 'login' | 'register';

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}

interface LoginValues { username: string; password: string }
interface RegisterValues { username: string; password: string; inviteCode: string }

export default function AuthModal({ open, onClose, initialMode = 'login' }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginForm] = Form.useForm<LoginValues>();
  const [registerForm] = Form.useForm<RegisterValues>();

  function reset() {
    setError(null);
    setSubmitting(false);
    loginForm.resetFields();
    registerForm.resetFields();
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function onLogin() {
    try {
      const values = await loginForm.validateFields();
      setSubmitting(true);
      setError(null);
      await login(values);
      handleClose();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单校验失败，Antd 已展示
      setError(err?.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegister() {
    try {
      const values = await registerForm.validateFields();
      setSubmitting(true);
      setError(null);
      await register(values);
      handleClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      setError(err?.message || '注册失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={mode === 'login' ? '登录账号' : '注册新账号'}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={420}
    >
      <Tabs
        activeKey={mode}
        onChange={(k) => { setMode(k as Mode); setError(null); }}
        items={[
          {
            key: 'login',
            label: '登录',
            children: (
              <Form form={loginForm} layout="vertical" onFinish={onLogin} requiredMark={false}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, min: 2, max: 32, message: '2-32 个字符' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: true, min: 6, max: 128, message: '6-128 个字符' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
                </Form.Item>
                {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
                <Button type="primary" htmlType="submit" block loading={submitting}>登录</Button>
              </Form>
            ),
          },
          {
            key: 'register',
            label: '注册',
            children: (
              <Form form={registerForm} layout="vertical" onFinish={onRegister} requiredMark={false}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[
                    { required: true, min: 2, max: 32, message: '2-32 个字符' },
                    { pattern: /^[\w.\-@]+$/, message: '仅支持字母/数字/._-@' },
                  ]}
                >
                  <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[
                    { required: true, min: 6, max: 128, message: '6-128 个字符' },
                    { min: 6, message: '至少 6 位' },
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="密码（≥6 位）" autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                  name="inviteCode"
                  label="邀请码"
                  rules={[{ required: true, message: '请输入邀请码' }]}
                >
                  <Input.Password prefix={<KeyOutlined />} placeholder="向管理员索取" autoComplete="off" />
                </Form.Item>
                {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
                <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>
                  注册后账号会保存在云端，可在新设备上登录同步。
                </Typography.Paragraph>
                <Button type="primary" htmlType="submit" block loading={submitting}>注册并登录</Button>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
}
