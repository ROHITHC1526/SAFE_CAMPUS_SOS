import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { motion } from 'framer-motion';
import { SafetyCertificateOutlined, MailOutlined, LockOutlined, UserOutlined, PhoneOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      });
      message.success('Registration successful!');
      navigate('/student');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="floating-orb" style={{ width: 300, height: 300, background: 'rgba(239, 68, 68, 0.15)', top: '15%', right: '10%' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
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
            <Title level={3} style={{ color: '#fff', margin: 0 }}>Create Account</Title>
          </Link>
          <Text style={{ color: '#a1a1aa' }}>Register as a student on SafeCampus</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="firstName" rules={[{ required: true, message: 'Required' }]} style={{ flex: 1 }}>
              <Input prefix={<UserOutlined style={{ color: '#a1a1aa' }} />} placeholder="First Name" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
            </Form.Item>
            <Form.Item name="lastName" rules={[{ required: true, message: 'Required' }]} style={{ flex: 1 }}>
              <Input placeholder="Last Name" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
            </Form.Item>
          </div>

          <Form.Item name="email" rules={[{ required: true, message: 'Enter email' }, { type: 'email', message: 'Invalid email' }]}>
            <Input prefix={<MailOutlined style={{ color: '#a1a1aa' }} />} placeholder="Email" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
          </Form.Item>

          <Form.Item name="phone">
            <Input prefix={<PhoneOutlined style={{ color: '#a1a1aa' }} />} placeholder="Phone (optional)" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Enter password' }, { min: 6, message: 'Min 6 characters' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#a1a1aa' }} />} placeholder="Password" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
          </Form.Item>

          <Form.Item name="confirmPassword" dependencies={['password']} rules={[{ required: true, message: 'Confirm password' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject('Passwords do not match'); } })]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#a1a1aa' }} />} placeholder="Confirm Password" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #991b1b)', border: 'none', fontWeight: 700, fontSize: 16 }}>
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#a1a1aa' }}>Already have an account? <Link to="/login" style={{ color: '#ef4444', fontWeight: 600 }}>Login</Link></Text>
        </div>
      </motion.div>
    </div>
  );
}
