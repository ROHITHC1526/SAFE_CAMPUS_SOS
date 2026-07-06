import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Segmented } from 'antd';
import { motion } from 'framer-motion';
import {
  SafetyCertificateOutlined,
  MailOutlined,
  LockOutlined,
  UserOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>('STUDENT');
  const { login } = useAuth();
  const navigate = useNavigate();

  const roleOptions = [
    { label: <><UserOutlined /> Student</>, value: 'STUDENT' },
    { label: <><SecurityScanOutlined /> Security</>, value: 'SECURITY' },
    { label: <><SettingOutlined /> Admin</>, value: 'ADMIN' },
  ];

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password, role);
      message.success('Login successful!');
      const redirectMap: Record<string, string> = { STUDENT: '/student', SECURITY: '/security', ADMIN: '/admin' };
      navigate(redirectMap[role] || '/');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="floating-orb" style={{ width: 300, height: 300, background: 'rgba(239, 68, 68, 0.15)', top: '20%', left: '10%' }} />
      <div className="floating-orb" style={{ width: 200, height: 200, background: 'rgba(16, 185, 129, 0.1)', bottom: '20%', right: '15%', animationDelay: '-7s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: 440, padding: 40, position: 'relative', zIndex: 2 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
              style={{ color: '#a1a1aa', padding: 0 }}
            >
              Back to Home
            </Button>
          </div>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <SafetyCertificateOutlined style={{ fontSize: 40, color: '#ef4444', marginBottom: 12 }} />
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              Welcome Back
            </Title>
          </Link>
          <Text style={{ color: '#a1a1aa' }}>Sign in to SafeCampus AI</Text>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Segmented
            block
            options={roleOptions}
            value={role}
            onChange={(val) => setRole(val as string)}
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="email" rules={[{ required: true, message: 'Enter your email' }, { type: 'email', message: 'Invalid email' }]}>
            <Input prefix={<MailOutlined style={{ color: '#a1a1aa' }} />} placeholder="Email address" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#a1a1aa' }} />} placeholder="Password" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                border: 'none',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              Sign In as {role === 'STUDENT' ? 'Student' : role === 'SECURITY' ? 'Security' : 'Admin'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#a1a1aa' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#ef4444', fontWeight: 600 }}>Register</Link>
          </Text>
        </div>

        <div style={{
          marginTop: 24, padding: 16, background: 'rgba(239, 68, 68, 0.04)',
          borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.15)',
        }}>
          <Text style={{ color: '#a1a1aa', fontSize: 12, display: 'block', marginBottom: 4 }}>Demo Credentials:</Text>
          <Text style={{ color: '#71717a', fontSize: 11 }}>
            Student: student@safecampus.com / Student@123<br />
            Security: security@safecampus.com / Security@123<br />
            Admin: admin@safecampus.com / Admin@123
          </Text>
        </div>
      </motion.div>
    </div>
  );
}
