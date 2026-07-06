import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, Row, Col, Typography, Button, Table, Tag, Badge, Avatar, Tabs, Select, message, List, Drawer, Form, Input, Tooltip, Statistic } from 'antd';
import { motion } from 'framer-motion';
import {
  SafetyCertificateOutlined, DashboardOutlined, AlertOutlined, UserOutlined,
  TeamOutlined, BarChartOutlined, LogoutOutlined, BellOutlined, SettingOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined, RiseOutlined,
  FallOutlined, FireOutlined, PlusOutlined, HomeOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { analyticsAPI, userAPI, incidentAPI, notificationAPI } from '../services/api';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#64748b'];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    message.success('Logged out successfully');
  };

  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [guardPerf, setGuardPerf] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [addUserDrawer, setAddUserDrawer] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('sos:new', () => { message.warning('🚨 New SOS Alert!'); loadAll(); });
    socket.on('incident:updated', () => loadAll());
    return () => { socket.off('sos:new'); socket.off('incident:updated'); };
  }, [socket]);

  const loadAll = async () => {
    try {
      const [statsRes, trendsRes, perfRes, logsRes, usersRes, incRes, notifRes] = await Promise.all([
        analyticsAPI.getDashboard().catch(() => null),
        analyticsAPI.getTrends().catch(() => null),
        analyticsAPI.getGuardPerformance().catch(() => null),
        analyticsAPI.getActivityLogs({ limit: 20 }).catch(() => null),
        userAPI.getAll({ limit: 50 }).catch(() => null),
        incidentAPI.getAll({ limit: 50 }).catch(() => null),
        notificationAPI.getAll({ limit: 5 }).catch(() => null),
      ]);

      if (statsRes) setStats(statsRes.data.data);
      if (trendsRes) setTrends(trendsRes.data.data);
      if (perfRes) setGuardPerf(perfRes.data.data);
      if (logsRes) setActivityLogs(logsRes.data.data);
      if (usersRes) setUsers(usersRes.data.data.users);
      if (incRes) setIncidents(incRes.data.data.incidents);
      if (notifRes) setUnreadCount(notifRes.data.data.unread);
    } catch {}
  };

  const handleAddUser = async (values: any) => {
    setAddUserLoading(true);
    try {
      await userAPI.createUser(values);
      message.success('User created!');
      setAddUserDrawer(false);
      loadAll();
    } catch (e: any) {
      message.error(e.response?.data?.error || 'Failed');
    } finally {
      setAddUserLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Students', value: stats?.totalStudents || 0, icon: <UserOutlined />, color: '#6366f1', trend: '+12%' },
    { title: 'Security Guards', value: stats?.totalGuards || 0, icon: <TeamOutlined />, color: '#06b6d4', trend: '+2' },
    { title: 'Total Incidents', value: stats?.totalIncidents || 0, icon: <AlertOutlined />, color: '#f59e0b', trend: null },
    { title: "Today's SOS", value: stats?.todaysSOS || 0, icon: <FireOutlined />, color: '#ef4444', trend: null },
    { title: 'Pending', value: stats?.pendingIncidents || 0, icon: <ExclamationCircleOutlined />, color: '#a855f7', trend: null },
    { title: 'Resolved', value: stats?.resolvedIncidents || 0, icon: <CheckCircleOutlined />, color: '#10b981', trend: null },
  ];

  const incidentColumns = [
    {
      title: 'Student', dataIndex: 'student', key: 'student',
      render: (s: any) => s ? <><Avatar size="small" style={{ background: '#6366f1', marginRight: 8 }}>{s.firstName?.[0]}</Avatar>{s.firstName} {s.lastName}</> : '-',
    },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: 'Severity', dataIndex: 'severity', key: 'severity',
      render: (v: string) => <span className={`severity-badge ${v.toLowerCase()}`}>{v}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const colors: Record<string, string> = { PENDING: 'warning', ASSIGNED: 'processing', IN_PROGRESS: 'processing', RESOLVED: 'success', CANCELLED: 'default' };
        return <Tag color={colors[v] || 'default'}>{v}</Tag>;
      },
    },
    {
      title: 'Time', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(v).toLocaleString()}</Text>,
    },
    {
      title: 'Response', dataIndex: 'responseTime', key: 'responseTime',
      render: (v: number) => v ? <Text style={{ color: '#10b981' }}>{Math.round(v / 60)}min</Text> : <Text style={{ color: '#94a3b8' }}>-</Text>,
    },
    {
      title: 'Action', key: 'action',
      render: (_: any, record: any) => (
        <Button size="small" type="link" onClick={() => navigate(`/incident/${record.id}`)}>View</Button>
      ),
    },
  ];

  const userColumns = [
    {
      title: 'Name', key: 'name',
      render: (_: any, r: any) => <><Avatar size="small" style={{ background: '#6366f1', marginRight: 8 }}>{r.firstName?.[0]}</Avatar>{r.firstName} {r.lastName}</>,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (v: string) => <Tag color={v === 'ADMIN' ? 'red' : v === 'SECURITY' ? 'blue' : 'green'}>{v}</Tag> },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Badge status={v ? 'success' : 'error'} text={v ? 'Active' : 'Inactive'} /> },
    {
      title: 'Last Login', dataIndex: 'lastLogin', key: 'lastLogin',
      render: (v: string) => v ? <Text style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(v).toLocaleDateString()}</Text> : '-',
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => userAPI.toggleActive(r.id).then(() => { message.success('Updated!'); loadAll(); })}>
          {r.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  const sidebarItems = [
    { key: 'overview', icon: <DashboardOutlined />, label: 'Overview' },
    { key: 'incidents', icon: <AlertOutlined />, label: 'Incidents' },
    { key: 'users', icon: <TeamOutlined />, label: 'Users' },
    { key: 'analytics', icon: <BarChartOutlined />, label: 'Analytics' },
    { key: 'logs', icon: <ClockCircleOutlined />, label: 'Activity Logs' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      <Sider width={260} style={{ background: '#111128', borderRight: '1px solid #2a2a4a', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #2a2a4a' }}>
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#6366f1' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Safe<span style={{ color: '#6366f1' }}>Campus</span></span>
        </div>

        <div style={{ padding: '12px 16px' }}>
          {sidebarItems.map((item) => (
            <div
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
                cursor: 'pointer', marginBottom: 4,
                background: activeTab === item.key ? 'rgba(99,102,241,0.1)' : 'transparent',
                color: activeTab === item.key ? '#818cf8' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontWeight: activeTab === item.key ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <div style={{ padding: 12, background: 'rgba(99,102,241,0.05)', borderRadius: 10, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar style={{ background: '#6366f1' }}>{user?.firstName?.[0]}</Avatar>
            <div>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user?.firstName}</Text>
              <br /><Tag color="red" style={{ fontSize: 10 }}>Admin</Tag>
            </div>
          </div>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} block style={{ color: '#94a3b8', justifyContent: 'flex-start' }}>Logout</Button>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 260, background: '#0a0a1a' }}>
        <Header style={{ background: 'rgba(17,17,40,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #2a2a4a', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <DashboardOutlined style={{ color: '#6366f1', marginRight: 8 }} />
            Admin Dashboard
          </Title>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
              style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              Back to Home
            </Button>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}
            >
              Logout
            </Button>
            <Tooltip title={isConnected ? 'Live' : 'Offline'}>
              <Badge status={isConnected ? 'success' : 'error'} />
            </Tooltip>
            <Badge count={unreadCount}><Button type="text" icon={<BellOutlined style={{ fontSize: 20, color: '#94a3b8' }} />} /></Badge>
          </div>
        </Header>

        <Content style={{ padding: 24 }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stat Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statCards.map((card, i) => (
                  <Col xs={12} sm={8} lg={4} key={i}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{card.title}</Text>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 4 }}>{card.value}</div>
                          {card.trend && <Text style={{ color: '#10b981', fontSize: 12 }}><RiseOutlined /> {card.trend}</Text>}
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${card.color}15`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {card.icon}
                        </div>
                      </div>
                    </motion.div>
                  </Col>
                ))}
              </Row>

              {/* Avg Response Time */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={6}>
                  <Card style={{ textAlign: 'center' }}>
                    <ClockCircleOutlined style={{ fontSize: 32, color: '#6366f1', marginBottom: 8 }} />
                    <Statistic
                      title={<Text style={{ color: '#94a3b8' }}>Avg Response Time</Text>}
                      value={stats?.avgResponseTime ? Math.round(stats.avgResponseTime / 60) : 0}
                      suffix="min"
                      valueStyle={{ color: '#fff', fontWeight: 800 }}
                    />
                  </Card>
                </Col>

                {/* Incident Trend Chart */}
                <Col xs={24} md={18}>
                  <Card title="Incident Trends (30 days)">
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={trends?.dailyTrends || []}>
                        <defs>
                          <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ background: '#161636', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                        <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorIncidents)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>

              {/* Category & Severity Breakdown */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={12}>
                  <Card title="Incidents by Category">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={trends?.categoryBreakdown || []}
                          dataKey="count"
                          nameKey="category"
                          cx="50%" cy="50%"
                          outerRadius={100}
                          label={(entry: any) => entry.category}
                        >
                          {(trends?.categoryBreakdown || []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ background: '#161636', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Severity Distribution">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={trends?.severityBreakdown || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                        <XAxis dataKey="severity" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ background: '#161636', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {(trends?.severityBreakdown || []).map((_: any, i: number) => (
                            <Cell key={i} fill={['#10b981', '#f59e0b', '#f97316', '#ef4444'][i] || '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>

              {/* Guard Performance */}
              <Card title="Guard Performance" style={{ marginBottom: 24 }}>
                <Table
                  dataSource={guardPerf}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Guard', key: 'name', render: (_: any, r: any) => <Text style={{ color: '#fff' }}>{r.user?.firstName} {r.user?.lastName}</Text> },
                    { title: 'Badge', dataIndex: 'badgeNumber', key: 'badge' },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Badge status={v === 'AVAILABLE' ? 'success' : 'processing'} text={v} /> },
                    { title: 'Resolved', dataIndex: 'totalResolved', key: 'resolved', render: (v: number) => <Text style={{ color: '#10b981', fontWeight: 700 }}>{v}</Text> },
                    { title: 'Rating', dataIndex: 'rating', key: 'rating', render: (v: number) => <Text style={{ color: '#f59e0b' }}>⭐ {v}</Text> },
                  ]}
                />
              </Card>
            </>
          )}

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <Card title="All Incidents">
              <Table dataSource={incidents} columns={incidentColumns} rowKey="id" pagination={{ pageSize: 15 }} scroll={{ x: 800 }} />
            </Card>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card
              title="User Management"
              extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserDrawer(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none' }}>Add User</Button>}
            >
              <Table dataSource={users} columns={userColumns} rowKey="id" pagination={{ pageSize: 15 }} scroll={{ x: 800 }} />
            </Card>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="Incident Trends">
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={trends?.dailyTrends || []}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ background: '#161636', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                        <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#grad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            </>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <Card title="Activity Logs">
              <List
                dataSource={activityLogs}
                renderItem={(log: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar size="small" style={{ background: '#6366f1' }}>{log.user?.firstName?.[0] || '?'}</Avatar>}
                      title={<Text style={{ color: '#fff' }}>{log.action}</Text>}
                      description={
                        <div>
                          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{log.user?.firstName} {log.user?.lastName} · {log.details}</Text>
                          <br />
                          <Text style={{ color: '#64748b', fontSize: 11 }}>{new Date(log.createdAt).toLocaleString()}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <Card title="System Settings">
              <Text style={{ color: '#94a3b8' }}>Settings management coming soon. Configure SOS timeouts, notification preferences, and campus boundaries.</Text>
            </Card>
          )}
        </Content>
      </Layout>

      {/* Add User Drawer */}
      <Drawer title="Add New User" open={addUserDrawer} onClose={() => setAddUserDrawer(false)} width={400}>
        <Form layout="vertical" onFinish={handleAddUser}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={[{ value: 'STUDENT', label: 'Student' }, { value: 'SECURITY', label: 'Security' }, { value: 'ADMIN', label: 'Admin' }]} />
          </Form.Item>
          <Form.Item name="badgeNumber" label="Badge Number (Security only)"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={addUserLoading} style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none' }}>
            Create User
          </Button>
        </Form>
      </Drawer>
    </Layout>
  );
}
