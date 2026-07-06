import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Row, Col, Collapse, Space, Modal, Form, Input } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  TeamOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  BellOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ArrowRightOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const stats = [
  { value: '< 30s', label: 'Average Response Time', icon: <ClockCircleOutlined /> },
  { value: '99.9%', label: 'Uptime Guarantee', icon: <CheckCircleOutlined /> },
  { value: '5000+', label: 'Students Protected', icon: <TeamOutlined /> },
  { value: '24/7', label: 'Security Coverage', icon: <SafetyCertificateOutlined /> },
];

const features = [
  { icon: <ThunderboltOutlined style={{ fontSize: 28 }} />, title: 'One-Tap SOS', desc: 'Trigger emergency alerts instantly with a single tap. AI categorizes and prioritizes your emergency.' },
  { icon: <EnvironmentOutlined style={{ fontSize: 28 }} />, title: 'Live GPS Tracking', desc: 'Real-time location streaming to security. Track responders on map with ETA and route visualization.' },
  { icon: <PhoneOutlined style={{ fontSize: 28 }} />, title: 'Audio & Video Calls', desc: 'Instant WebRTC-powered communication with security. Crystal-clear audio and video during emergencies.' },
  { icon: <BellOutlined style={{ fontSize: 28 }} />, title: 'Smart Notifications', desc: 'WhatsApp, SMS, push notifications to parents, security, and admin simultaneously.' },
  { icon: <RobotOutlined style={{ fontSize: 28 }} />, title: 'AI-Powered Safety', desc: 'Threat prediction, fake SOS detection, smart responder assignment, and emergency guidance.' },
  { icon: <GlobalOutlined style={{ fontSize: 28 }} />, title: 'Campus Heatmap', desc: 'Identify risk zones with AI-generated heatmaps. Make data-driven safety improvements.' },
];

const steps = [
  { step: '01', title: 'Trigger SOS', desc: 'Long-press the SOS button and select emergency type. Your location is captured instantly.' },
  { step: '02', title: 'AI Assigns Responder', desc: 'Our AI analyzes severity, finds the nearest available guard, and assigns them automatically.' },
  { step: '03', title: 'Real-time Response', desc: 'Live chat, audio/video calls, and GPS tracking keep you connected until help arrives.' },
  { step: '04', title: 'Resolution & Report', desc: 'Incident is resolved, documented, and analyzed. Reports generated automatically.' },
];

const testimonials = [
  { name: 'Priya Sharma', role: 'B.Tech Student', quote: 'SafeCampus gave me confidence to walk around campus at night. The SOS response was under 2 minutes!' },
  { name: 'Dr. Rajesh Kumar', role: 'Campus Director', quote: 'Incident response time dropped by 70%. The analytics dashboard helps us make data-driven safety decisions.' },
  { name: 'Ravi Verma', role: 'Chief Security Officer', quote: 'The real-time tracking and auto-assignment has transformed how our security team operates.' },
];

const faqs = [
  { key: '1', label: 'How do I trigger an SOS?', children: 'Simply long-press the SOS button on your dashboard, select the emergency category, and help will be dispatched immediately.' },
  { key: '2', label: 'Who gets notified when I trigger SOS?', children: 'Your emergency contacts (parents), nearest security guard, campus security office, and admin are all notified via WhatsApp, SMS, and push notifications.' },
  { key: '3', label: 'Is my location tracked at all times?', children: 'No. Location tracking only activates when you trigger an SOS. Your privacy is our priority. Location data is encrypted and only accessible to authorized security personnel.' },
  { key: '4', label: 'What if there is no internet?', children: 'The app sends SMS as a fallback when internet connectivity is poor. Your SOS will still reach security.' },
  { key: '5', label: 'Can I report a false alarm?', children: 'Yes, you can cancel an SOS. However, repeated false alarms are flagged by our AI system to prevent misuse.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Footer modals states
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [contactFormSubmitted, setContactFormSubmitted] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper to scroll to section
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ background: '#000000', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '16px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: scrolled ? 'rgba(10, 10, 26, 0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SafetyCertificateOutlined style={{ fontSize: 28, color: '#ef4444' }} />
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Safe<span style={{ color: '#ef4444' }}>Campus</span></span>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }} className="desktop-nav">
          <Button type="text" style={{ color: '#a1a1aa' }} onClick={() => scrollToSection('features')}>Features</Button>
          <Button type="text" style={{ color: '#a1a1aa' }} onClick={() => scrollToSection('how-it-works')}>How It Works</Button>
          <Button type="text" style={{ color: '#a1a1aa' }} onClick={() => setPricingModalOpen(true)}>Pricing</Button>
          <Button type="text" style={{ color: '#a1a1aa' }} onClick={() => scrollToSection('faq')}>FAQ</Button>
          <Button type="text" style={{ color: '#a1a1aa' }} onClick={() => navigate('/login')}>Login</Button>
          <Button
            type="primary"
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Get Started
          </Button>
        </div>

        <Button
          type="text"
          className="mobile-menu-btn"
          icon={mobileMenu ? <CloseOutlined /> : <MenuOutlined />}
          onClick={() => setMobileMenu(!mobileMenu)}
          style={{ color: '#fff', display: 'none' }}
        />
      </motion.nav>

      {/* Hero Section */}
      <section className="hero-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', padding: '120px 40px 80px' }}>
        {/* Floating orbs */}
        <div className="floating-orb" style={{ width: 400, height: 400, background: 'rgba(239, 68, 68, 0.15)', top: '10%', left: '5%' }} />
        <div className="floating-orb" style={{ width: 300, height: 300, background: 'rgba(16, 185, 129, 0.12)', top: '50%', right: '10%', animationDelay: '-5s' }} />
        <div className="floating-orb" style={{ width: 200, height: 200, background: 'rgba(239, 68, 68, 0.08)', bottom: '10%', left: '30%', animationDelay: '-10s' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 2 }}>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={13}>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 24,
                  marginBottom: 24,
                }}>
                  <Text style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>
                    🛡️ AI-Powered Campus Safety Platform
                  </Text>
                </div>

                <Title style={{ color: '#fff', fontSize: 56, lineHeight: 1.1, margin: 0, fontWeight: 900 }}>
                  Your Safety,{' '}
                  <span className="gradient-text">Our Priority</span>
                </Title>

                <Paragraph style={{ color: '#a1a1aa', fontSize: 18, lineHeight: 1.7, marginTop: 24, maxWidth: 560 }}>
                  Real-time emergency response with AI-powered threat detection,
                  live GPS tracking, instant communication, and smart responder assignment.
                  One tap is all it takes.
                </Paragraph>

                <Space size={16} style={{ marginTop: 32 }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    onClick={() => navigate('/register')}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                      border: 'none',
                      borderRadius: 12,
                      height: 52,
                      padding: '0 32px',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    Get Protected Now
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate('/login')}
                    style={{
                      borderRadius: 12,
                      height: 52,
                      padding: '0 32px',
                      background: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontWeight: 600,
                    }}
                  >
                    Login
                  </Button>
                </Space>
              </motion.div>
            </Col>

            <Col xs={24} lg={11}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                {/* SOS Button Animation */}
                <div style={{ position: 'relative' }}>
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 240,
                      height: 240,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ef4444, #f97316)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 80px rgba(239, 68, 68, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 48, fontWeight: 900, letterSpacing: 4 }}>SOS</span>
                  </motion.div>

                  {/* Pulse rings */}
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '2px solid rgba(239, 68, 68, 0.4)',
                      }}
                    />
                  ))}

                  {/* Floating info cards */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{
                      position: 'absolute', top: -30, right: -80,
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 12, padding: '8px 16px',
                    }}
                  >
                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>✓ Guard Dispatched</Text>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                    style={{
                      position: 'absolute', bottom: -20, left: -90,
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 12, padding: '8px 16px',
                    }}
                  >
                    <Text style={{ color: '#818cf8', fontSize: 12, fontWeight: 600 }}>📍 Live Tracking</Text>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                    style={{
                      position: 'absolute', bottom: 40, right: -100,
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 12, padding: '8px 16px',
                    }}
                  >
                    <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>🔔 Parents Notified</Text>
                  </motion.div>
                </div>
              </motion.div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '60px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[24, 24]}>
          {stats.map((stat, i) => (
            <Col xs={12} sm={6} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card"
                style={{ padding: 24, textAlign: 'center' }}
              >
                <div style={{ color: '#ef4444', fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{stat.value}</div>
                <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{stat.label}</Text>
              </motion.div>
            </Col>
          ))}
        </Row>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 60 }}
        >
          <Title level={2} style={{ color: '#fff', fontSize: 40, fontWeight: 800 }}>
            Powerful <span className="gradient-text">Features</span>
          </Title>
          <Text style={{ color: '#a1a1aa', fontSize: 16 }}>
            Everything you need for a safe campus experience
          </Text>
        </motion.div>

        <Row gutter={[24, 24]}>
          {features.map((feature, i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card"
                style={{ padding: 32, height: '100%', cursor: 'default' }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ef4444', marginBottom: 20,
                }}>
                  {feature.icon}
                </div>
                <Title level={4} style={{ color: '#fff', margin: '0 0 8px 0' }}>{feature.title}</Title>
                <Text style={{ color: '#a1a1aa', lineHeight: 1.7 }}>{feature.desc}</Text>
              </motion.div>
            </Col>
          ))}
        </Row>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '80px 40px', background: '#0a0a0c', borderTop: '1px solid #27272a', borderBottom: '1px solid #27272a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 60 }}
          >
            <Title level={2} style={{ color: '#fff', fontSize: 40, fontWeight: 800 }}>
              How It <span className="gradient-text">Works</span>
            </Title>
          </motion.div>

          <Row gutter={[40, 40]}>
            {steps.map((step, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', fontSize: 24, fontWeight: 800, color: '#fff',
                  }}>
                    {step.step}
                  </div>
                  <Title level={4} style={{ color: '#fff', margin: '0 0 8px 0' }}>{step.title}</Title>
                  <Text style={{ color: '#a1a1aa', lineHeight: 1.7 }}>{step.desc}</Text>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 60 }}
        >
          <Title level={2} style={{ color: '#fff', fontSize: 40, fontWeight: 800 }}>
            What People <span className="gradient-text">Say</span>
          </Title>
        </motion.div>

        <Row gutter={[24, 24]}>
          {testimonials.map((t, i) => (
            <Col xs={24} md={8} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card"
                style={{ padding: 32, height: '100%' }}
              >
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <StarOutlined key={s} style={{ color: '#f59e0b', fontSize: 16 }} />
                  ))}
                </div>
                <Paragraph style={{ color: '#ffffff', fontSize: 15, lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{t.quote}"
                </Paragraph>
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ color: '#fff' }}>{t.name}</Text>
                  <br />
                  <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{t.role}</Text>
                </div>
              </motion.div>
            </Col>
          ))}
        </Row>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '80px 40px', background: '#0a0a0c', borderTop: '1px solid #27272a', borderBottom: '1px solid #27272a' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 48 }}
          >
            <Title level={2} style={{ color: '#fff', fontSize: 40, fontWeight: 800 }}>
              Frequently Asked <span className="gradient-text">Questions</span>
            </Title>
          </motion.div>

          <Collapse
            items={faqs}
            bordered={false}
            style={{ background: 'transparent' }}
            expandIconPosition="end"
          />
        </div>
      </section>

      {/* CTA */}
      <section id="cta" style={{ padding: '100px 40px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Title level={2} style={{ color: '#fff', fontSize: 44, fontWeight: 800 }}>
            Ready to Make Your Campus <span className="gradient-text">Safer?</span>
          </Title>
          <Paragraph style={{ color: '#a1a1aa', fontSize: 18, maxWidth: 600, margin: '16px auto 32px' }}>
            Join thousands of students who feel safer with SafeCampus AI.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              border: 'none',
              borderRadius: 12,
              height: 56,
              padding: '0 40px',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            Get Started Free
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '48px 40px 24px',
        borderTop: '1px solid #27272a',
        background: '#050507',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[40, 32]}>
            <Col xs={24} md={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <SafetyCertificateOutlined style={{ fontSize: 24, color: '#ef4444' }} />
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Safe<span style={{ color: '#ef4444' }}>Campus</span></span>
              </div>
              <Text style={{ color: '#a1a1aa', lineHeight: 1.7 }}>
                AI-powered campus safety platform. Protecting students 24/7 with real-time emergency response.
              </Text>
            </Col>
            <Col xs={12} md={5}>
              <Title level={5} style={{ color: '#fff' }}>Product</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text style={{ color: '#a1a1aa', cursor: 'pointer' }} className="footer-link" onClick={() => scrollToSection('features')}>Features</Text>
                <Text style={{ color: '#a1a1aa', cursor: 'pointer' }} className="footer-link" onClick={() => scrollToSection('how-it-works')}>How It Works</Text>
                <Text style={{ color: '#a1a1aa', cursor: 'pointer' }} className="footer-link" onClick={() => setPricingModalOpen(true)}>Pricing</Text>
              </div>
            </Col>
            <Col xs={12} md={5}>
              <Title level={5} style={{ color: '#fff' }}>Support</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text style={{ color: '#a1a1aa', cursor: 'pointer' }} className="footer-link" onClick={() => setHelpModalOpen(true)}>Help Center</Text>
                <Text style={{ color: '#a1a1aa', cursor: 'pointer' }} className="footer-link" onClick={() => setContactModalOpen(true)}>Contact</Text>
                <Text style={{ color: '#a1a1aa', cursor: 'pointer' }} className="footer-link" onClick={() => scrollToSection('faq')}>FAQ</Text>
              </div>
            </Col>
            <Col xs={12} md={6}>
              <Title level={5} style={{ color: '#fff' }}>Emergency</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text style={{ color: '#ef4444', fontWeight: 600 }}>🚨 Campus Security: 1800-425-6366</Text>
                <Text style={{ color: '#a1a1aa' }}>Police Desk: 100</Text>
                <Text style={{ color: '#a1a1aa' }}>Medical Trauma: 108</Text>
              </div>
            </Col>
          </Row>
          <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 24, borderTop: '1px solid #27272a' }}>
            <Text style={{ color: '#71717a', fontSize: 13 }}>
              © 2026 SafeCampus AI. All rights reserved. Built with ❤️ for campus safety.
            </Text>
          </div>
        </div>
      </footer>

      {/* Pricing Modal */}
      <Modal
        open={pricingModalOpen}
        onCancel={() => setPricingModalOpen(false)}
        footer={null}
        title={<span style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>💰 Pricing & Plans</span>}
        centered
        width={400}
      >
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <Title level={3} style={{ color: '#fff', margin: '0 0 8px 0' }}>100% Free</Title>
          <Text style={{ color: '#10b981', fontWeight: 600, display: 'block', marginBottom: 16 }}>Provided by LBRCE College Administration</Text>
          <Paragraph style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.6 }}>
            SafeCampus AI is sponsored entirely by LBRCE College to protect all registered students, security responders, and staff members.
          </Paragraph>
          <Button type="primary" block onClick={() => setPricingModalOpen(false)} style={{ background: '#ef4444', border: 'none', height: 40, borderRadius: 8, marginTop: 16 }}>
            Dismiss
          </Button>
        </div>
      </Modal>

      {/* Help Center Modal */}
      <Modal
        open={helpModalOpen}
        onCancel={() => setHelpModalOpen(false)}
        footer={null}
        title={<span style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>❓ Help & Support Center</span>}
        centered
        width={450}
      >
        <div style={{ padding: '16px 0' }}>
          <Paragraph style={{ color: '#a1a1aa', marginBottom: 20 }}>
            If you have issues logging in, registration errors, or need application training, contact our LBRCE IT Desk:
          </Paragraph>
          <div style={{ background: '#121214', border: '1px solid #27272a', padding: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Text style={{ color: '#71717a', fontSize: 12, display: 'block' }}>IT SUPPORT DESK EMAIL</Text>
              <Text strong style={{ color: '#fff' }}>support-safecampus@lbrce.ac.in</Text>
            </div>
            <div>
              <Text style={{ color: '#71717a', fontSize: 12, display: 'block' }}>SYSTEM ADMINISTRATOR DESK</Text>
              <Text strong style={{ color: '#fff' }}>+91 8659-222933</Text>
            </div>
            <div>
              <Text style={{ color: '#71717a', fontSize: 12, display: 'block' }}>OPERATING HOURS</Text>
              <Text strong style={{ color: '#10b981' }}>24 Hours Assistance / Active Response</Text>
            </div>
          </div>
          <Button type="primary" block onClick={() => setHelpModalOpen(false)} style={{ background: '#ef4444', border: 'none', height: 40, borderRadius: 8, marginTop: 24 }}>
            Close Support
          </Button>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal
        open={contactModalOpen}
        onCancel={() => { setContactModalOpen(false); setContactFormSubmitted(false); }}
        footer={null}
        title={<span style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>✉️ Send Message to Safety Desk</span>}
        centered
        width={450}
      >
        <div style={{ padding: '16px 0' }}>
          {contactFormSubmitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#fff' }}>Message Dispatched</Title>
              <Text style={{ color: '#a1a1aa' }}>Our safety administrator will review your message shortly.</Text>
              <Button type="primary" block onClick={() => { setContactModalOpen(false); setContactFormSubmitted(false); }} style={{ background: '#ef4444', border: 'none', height: 40, borderRadius: 8, marginTop: 24 }}>
                Done
              </Button>
            </div>
          ) : (
            <Form layout="vertical" onFinish={() => setContactFormSubmitted(true)}>
              <Form.Item label="Your Name" required>
                <Input placeholder="Enter your full name" required />
              </Form.Item>
              <Form.Item label="Email Address" required>
                <Input type="email" placeholder="Enter your email" required />
              </Form.Item>
              <Form.Item label="Message Description" required>
                <TextArea rows={4} placeholder="Type your query or suggestion here..." required />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" block style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)', border: 'none', height: 44, borderRadius: 8 }}>
                  Send Message
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Modal>
    </div>
  );
}
