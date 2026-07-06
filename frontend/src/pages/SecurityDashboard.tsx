import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, Row, Col, Button, Tag, Typography, Badge, Avatar, List, message, Drawer, Tooltip, Form, Input } from 'antd';
import { motion } from 'framer-motion';
import {
  SafetyCertificateOutlined, AlertOutlined, CheckCircleOutlined, PhoneOutlined,
  EnvironmentOutlined, LogoutOutlined, BellOutlined,
  MessageOutlined, CarOutlined, HomeOutlined, AimOutlined,
  HistoryOutlined, PieChartOutlined, SearchOutlined, InfoCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { incidentAPI, notificationAPI, buildingAPI, locationAPI, mediaAPI } from '../services/api';
import LiveCampusMap from '../components/LiveCampusMap';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function SecurityDashboard() {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/');
    message.success('Logged out successfully');
  };

  const [activeView, setActiveView] = useState<'dashboard' | 'resolved'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);

  useEffect(() => {
    const loadEvidence = async () => {
      if (selectedIncident?.id) {
        try {
          const res = await mediaAPI.getEvidence(selectedIncident.id);
          setEvidenceList(res.data.data || []);
        } catch {
          setEvidenceList([]);
        }
      } else {
        setEvidenceList([]);
      }
    };
    loadEvidence();
  }, [selectedIncident?.id]);
  // Map and Location tracking state
  const [buildings, setBuildings] = useState<any[]>([]);
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [currentGuardLocation, setCurrentGuardLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadData();
    loadMapData();
  }, []);

  // Geolocation tracking for Guard
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const coords = { lat: latitude, lng: longitude };
          setCurrentGuardLocation(coords);

          // Update backend REST API
          try {
            await locationAPI.update({ latitude, longitude, accuracy: accuracy || undefined });
          } catch {}

          // Emit real-time location via Socket
          if (socket) {
            socket.emit('location:update', {
              latitude,
              longitude,
              accuracy,
            });
          }
        },
        (err) => console.error('Error tracking security guard location:', err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [socket]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('sos:incoming', (data: any) => {
      message.warning({ content: `🚨 New SOS: ${data.incident.category} - ${data.incident.student?.firstName}`, duration: 10 });
      loadData();
    });

    socket.on('sos:new', () => {
      message.info('New incident reported');
      loadData();
    });

    socket.on('incident:updated', () => loadData());

    socket.on('notification:new', (data: any) => {
      message.info(`🔔 ${data.title}: ${data.message}`);
      loadData();
    });

    socket.on('location:update', (data: any) => {
      // If student is broadcasting location
      setIncidents(prev =>
        prev.map(inc =>
          inc.studentId === data.userId
            ? { ...inc, latitude: data.latitude, longitude: data.longitude }
            : inc
        )
      );

      // If active viewing drawer incident
      setSelectedIncident((prev: any) => {
        if (prev && prev.studentId === data.userId) {
          return { ...prev, latitude: data.latitude, longitude: data.longitude };
        }
        return prev;
      });
    });

    return () => {
      socket.off('sos:incoming');
      socket.off('sos:new');
      socket.off('incident:updated');
      socket.off('notification:new');
      socket.off('location:update');
    };
  }, [socket, selectedIncident]);

  const loadData = async () => {
    try {
      const [incRes, notifRes] = await Promise.all([
        incidentAPI.getAll({ limit: 50 }),
        notificationAPI.getAll({ limit: 50 }),
      ]);
      setIncidents(incRes.data.data.incidents);
      setNotifications(notifRes.data.data.notifications || []);
      setUnreadCount(notifRes.data.data.unread);
    } catch {}
  };

  const loadMapData = async () => {
    try {
      const [bRes, szRes] = await Promise.all([
        buildingAPI.getAll(),
        buildingAPI.getSafeZones(),
      ]);
      setBuildings(bRes.data.data);
      setSafeZones(szRes.data.data);
    } catch {}
  };

  const handleAccept = async (incidentId: string) => {
    try {
      const res = await incidentAPI.accept(incidentId);
      message.success('Incident accepted! Navigate to the location.');
      
      // Auto-open Student Live Location Panel
      const detailRes = await incidentAPI.getById(incidentId);
      setSelectedIncident(detailRes.data.data);
      setDetailDrawerOpen(true);
      
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to accept');
    }
  };

  const handleUpdateStatus = async (incidentId: string, status: string) => {
    setStatusLoading(true);
    try {
      await incidentAPI.updateStatus(incidentId, { status });
      message.success(`Status updated to ${status}`);
      loadData();
      setDetailDrawerOpen(false);
    } catch {
      message.error('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const map: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#10b981' };
    return map[severity] || '#94a3b8';
  };

  const pendingIncidents = incidents.filter(i => i.status === 'PENDING');
  const activeIncidents = incidents.filter(i => ['ASSIGNED', 'IN_PROGRESS', 'ON_THE_WAY', 'REACHED'].includes(i.status));
  const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED');

  // Determine current active incident student coordinates to show on map
  const activeSOS = activeIncidents[0] || pendingIncidents[0] || null;
  const mapStudentLoc = activeSOS ? { lat: activeSOS.latitude, lng: activeSOS.longitude } : null;

  return (
    <Layout style={{ minHeight: '100vh', background: '#000000' }}>
      <Sider width={260} style={{ background: '#0a0a0c', borderRight: '1px solid #27272a', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #27272a' }}>
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#ef4444' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Safe<span style={{ color: '#ef4444' }}>Campus</span></span>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 12, marginBottom: 16, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <Avatar size={48} style={{ background: '#ef4444', marginBottom: 8 }}>{user?.firstName?.[0]}</Avatar>
            <Title level={5} style={{ color: '#fff', margin: '4px 0' }}>{user?.firstName} {user?.lastName}</Title>
            <Tag color="error">Security Guard</Tag>
            <div style={{ marginTop: 8 }}>
              <Badge status={isConnected ? 'success' : 'error'} text={<Text style={{ color: '#a1a1aa', fontSize: 12 }}>{isConnected ? 'Online' : 'Offline'}</Text>} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div className="stat-card" style={{ padding: 12 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 11 }}>Pending SOS</Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{pendingIncidents.length}</div>
            </div>
            <div className="stat-card" style={{ padding: 12 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 11 }}>Active</Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{activeIncidents.length}</div>
            </div>
            <div className="stat-card" style={{ padding: 12 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 11 }}>Resolved</Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{resolvedIncidents.length}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, borderTop: '1px solid #27272a', paddingTop: 16 }}>
            <Button
              type={activeView === 'dashboard' ? 'primary' : 'text'}
              icon={<AlertOutlined />}
              onClick={() => setActiveView('dashboard')}
              block
              style={{
                textAlign: 'left',
                justifyContent: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                background: activeView === 'dashboard' ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'transparent',
                border: 'none',
                color: '#fff',
              }}
            >
              Command Center
            </Button>
            <Button
              type={activeView === 'resolved' ? 'primary' : 'text'}
              icon={<CheckCircleOutlined />}
              onClick={() => setActiveView('resolved')}
              block
              style={{
                textAlign: 'left',
                justifyContent: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                background: activeView === 'resolved' ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'transparent',
                border: 'none',
                color: '#fff',
              }}
            >
              Resolved History
            </Button>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} block style={{ color: '#94a3b8', justifyContent: 'flex-start' }}>
            Logout
          </Button>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 260, background: '#0a0a1a' }}>
        <Header style={{
          background: 'rgba(17, 17, 40, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #2a2a4a',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <AlertOutlined style={{ color: '#6366f1', marginRight: 8 }} />
            Security Command Center
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
            <Badge count={unreadCount}>
              <Button type="text" icon={<BellOutlined style={{ fontSize: 20, color: '#94a3b8' }} />} onClick={() => setNotifDrawerOpen(true)} />
            </Badge>
          </div>
        </Header>

        <Content style={{ padding: 24 }}>
          {activeView === 'dashboard' ? (
            <Row gutter={[24, 24]}>
              {/* Left list of alerts */}
              <Col xs={24} lg={13}>
                {/* Incoming SOS Alerts */}
                {pendingIncidents.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card
                      title={<span style={{ color: '#ef4444', fontWeight: 700 }}>🚨 INCOMING SOS ALERTS</span>}
                      style={{ marginBottom: 24, background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      {pendingIncidents.map((inc) => (
                        <motion.div
                          key={inc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          style={{
                            padding: 16,
                            borderRadius: 12,
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            marginBottom: 12,
                          }}
                        >
                          <Row gutter={16} align="middle">
                            <Col flex="1">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <Avatar style={{ background: '#ef4444' }}>{inc.student?.firstName?.[0]}</Avatar>
                                <div>
                                  <Text strong style={{ color: '#fff', fontSize: 16 }}>{inc.student?.firstName} {inc.student?.lastName}</Text>
                                  <br />
                                  <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{inc.student?.phone} · {new Date(inc.createdAt).toLocaleTimeString()}</Text>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Tag color="error">{inc.category}</Tag>
                                <Tag style={{ background: `${getSeverityColor(inc.severity)}20`, color: getSeverityColor(inc.severity), borderColor: getSeverityColor(inc.severity) }}>
                                  {inc.severity}
                                </Tag>
                                <Tag icon={<EnvironmentOutlined />}>{inc.address || 'Campus'}</Tag>
                              </div>
                              {inc.description && (
                                <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 8, display: 'block' }}>{inc.description}</Text>
                              )}
                            </Col>
                            <Col>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAccept(inc.id)} style={{ background: '#10b981', borderColor: '#10b981' }}>
                                  Accept
                                </Button>
                                <Button icon={<AimOutlined />} onClick={() => { setSelectedIncident(inc); setDetailDrawerOpen(true); }}>
                                  Grid Map
                                </Button>
                              </div>
                            </Col>
                          </Row>
                        </motion.div>
                      ))}
                    </Card>
                  </motion.div>
                )}

                {/* Active Incidents */}
                <Card title={<span style={{ color: '#f59e0b' }}>⚡ Active Incidents</span>} style={{ marginBottom: 24 }}>
                  {activeIncidents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#a1a1aa' }}>
                      <CheckCircleOutlined style={{ fontSize: 40, color: '#10b981', marginBottom: 16 }} />
                      <br />No active incidents. All clear!
                    </div>
                  ) : (
                    activeIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        style={{
                          padding: 16, borderRadius: 12, marginBottom: 12,
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                        }}
                        onClick={() => { setSelectedIncident(inc); setDetailDrawerOpen(true); }}
                      >
                        <Row gutter={16} align="middle" justify="space-between">
                          <Col>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <Avatar style={{ background: '#ef4444' }}>{inc.student?.firstName?.[0]}</Avatar>
                              <div>
                                <Text strong style={{ color: '#fff' }}>{inc.student?.firstName} {inc.student?.lastName}</Text>
                                <div>
                                  <Tag color="orange">{inc.category}</Tag>
                                  <Tag color="blue">{inc.status.replace('_', ' ')}</Tag>
                                </div>
                              </div>
                            </div>
                          </Col>
                          <Col>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Tooltip title="Track on Map"><Button icon={<AimOutlined />} shape="circle" size="small" type="primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} /></Tooltip>
                              <Tooltip title="Call"><Button icon={<PhoneOutlined />} shape="circle" size="small" /></Tooltip>
                              <Tooltip title="Chat"><Button icon={<MessageOutlined />} shape="circle" size="small" onClick={(e) => { e.stopPropagation(); navigate(`/incident/${inc.id}`); }} /></Tooltip>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    ))
                  )}
                </Card>

                {/* Resolved Incidents Quick List */}
                <Card title={<span style={{ color: '#10b981' }}>✅ Resolved Today</span>}>
                  <List
                    dataSource={resolvedIncidents.slice(0, 5)}
                    locale={{ emptyText: <span style={{ color: '#a1a1aa' }}>No resolved incidents</span> }}
                    renderItem={(inc: any) => (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setSelectedIncident(inc); setDetailDrawerOpen(true); }}
                        actions={[
                          <Text style={{ color: '#a1a1aa', fontSize: 12 }}>
                            {inc.responseTime ? `${Math.round(inc.responseTime / 60)}min` : '-'}
                          </Text>
                        ]}
                      >
                        <List.Item.Meta
                          title={<Text style={{ color: '#fff' }}>{inc.category} Alert Resolved</Text>}
                          description={<Text style={{ color: '#a1a1aa', fontSize: 12 }}>Student: {inc.student?.firstName} {inc.student?.lastName} · {new Date(inc.createdAt).toLocaleString()}</Text>}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              {/* Right side live campus grid tracking map */}
              <Col xs={24} lg={11}>
                <Card title={<span style={{ color: '#10b981' }}>🛡️ Live Campus Grid Tracking</span>} style={{ height: '100%', minHeight: '500px' }}>
                  <LiveCampusMap
                    studentLocation={mapStudentLoc}
                    guardLocation={currentGuardLocation}
                    studentName={activeSOS?.student ? `${activeSOS.student.firstName} ${activeSOS.student.lastName}` : 'Student (SOS)'}
                    guardName={user ? `${user.firstName} ${user.lastName}` : 'Security Responder'}
                    buildings={buildings}
                    safeZones={safeZones}
                    height="450px"
                  />
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#a1a1aa', fontSize: 12 }}>
                      📍 Red marker: Student · 🟢 Green marker: Guard Location
                    </Text>
                    {activeSOS && <Tag color="error">SOS Active</Tag>}
                  </div>
                </Card>
              </Col>
            </Row>
          ) : (
            // Render Resolved History & Statistics View
            <div>
              {/* Statistics Row */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Card size="small" className="stat-card" style={{ background: '#0a0a0c', border: '1px solid #27272a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CheckCircleOutlined style={{ fontSize: 32, color: '#10b981' }} />
                      <div>
                        <Text style={{ color: '#a1a1aa', fontSize: 12, display: 'block' }}>TOTAL RESOLVED ALERTS</Text>
                        <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>{resolvedIncidents.length}</Title>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card size="small" className="stat-card" style={{ background: '#0a0a0c', border: '1px solid #27272a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <HistoryOutlined style={{ fontSize: 32, color: '#ef4444' }} />
                      <div>
                        <Text style={{ color: '#a1a1aa', fontSize: 12, display: 'block' }}>AVG RESPONSE TIME</Text>
                        <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>
                          {resolvedIncidents.length > 0
                            ? `${Math.round(resolvedIncidents.reduce((acc, curr) => acc + (curr.responseTime || 0), 0) / resolvedIncidents.length / 60)} mins`
                            : '0 mins'}
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card size="small" className="stat-card" style={{ background: '#0a0a0c', border: '1px solid #27272a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <PieChartOutlined style={{ fontSize: 32, color: '#f59e0b' }} />
                      <div>
                        <Text style={{ color: '#a1a1aa', fontSize: 12, display: 'block' }}>LBRCE GRID COVERAGE</Text>
                        <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>100% Active</Title>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Resolved Incidents History List with Search Filter */}
              <Card 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                    <span style={{ color: '#fff', fontWeight: 700 }}>📋 Resolved Incidents Log History</span>
                    <Input
                      placeholder="Search by student name or category..."
                      prefix={<SearchOutlined style={{ color: '#a1a1aa' }} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: 300, background: 'rgba(255,255,255,0.05)', borderColor: '#27272a', borderRadius: 8, color: '#fff' }}
                    />
                  </div>
                }
                style={{ background: '#0a0a0c', borderColor: '#27272a' }}
              >
                <List
                  dataSource={resolvedIncidents.filter(inc => {
                    const searchLower = searchQuery.toLowerCase();
                    const categoryMatch = inc.category?.toLowerCase().includes(searchLower);
                    const nameMatch = `${inc.student?.firstName || ''} ${inc.student?.lastName || ''}`.toLowerCase().includes(searchLower);
                    return categoryMatch || nameMatch;
                  })}
                  locale={{ emptyText: <span style={{ color: '#a1a1aa' }}>No matching resolved incidents found</span> }}
                  renderItem={(inc: any) => (
                    <List.Item
                      style={{ borderBottom: '1px solid #27272a', padding: '16px 8px' }}
                      actions={[
                        <Button 
                          type="primary" 
                          icon={<InfoCircleOutlined />} 
                          onClick={() => { setSelectedIncident(inc); setDetailDrawerOpen(true); }}
                          style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)', border: 'none', borderRadius: 6 }}
                        >
                          View Details & Evidence
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar style={{ background: '#ef4444' }}>{inc.student?.firstName?.[0]}</Avatar>}
                        title={
                          <div>
                            <Text strong style={{ color: '#fff', fontSize: 15 }}>{inc.student?.firstName} {inc.student?.lastName}</Text>
                            <Tag color="error" style={{ marginLeft: 8 }}>{inc.category}</Tag>
                            <Tag style={{ background: `${getSeverityColor(inc.severity)}20`, color: getSeverityColor(inc.severity), borderColor: getSeverityColor(inc.severity) }}>
                              {inc.severity}
                            </Tag>
                          </div>
                        }
                        description={
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Text style={{ color: '#a1a1aa', fontSize: 13 }}>
                              📞 {inc.student?.phone || 'No phone'} · 📍 {inc.address || 'Campus'}
                            </Text>
                            <Text style={{ color: '#71717a', fontSize: 11 }}>
                              🚨 Triaged: {new Date(inc.createdAt).toLocaleString()} · ✅ Resolved: {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : new Date(inc.updatedAt).toLocaleString()}
                            </Text>
                            {inc.resolutionNotes && (
                              <Text style={{ color: '#10b981', fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>
                                📝 Resolution Notes: "{inc.resolutionNotes}"
                              </Text>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          )}
        </Content>
      </Layout>

      {/* Incident Detail Drawer */}
      <Drawer
        title={<span style={{ color: '#fff' }}>Incident Details</span>}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={420}
      >
        {selectedIncident && (
          <div>
            <div style={{ padding: 16, background: 'rgba(99,102,241,0.05)', borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar size={48} style={{ background: '#6366f1' }}>{selectedIncident.student?.firstName?.[0]}</Avatar>
                <div>
                  <Title level={5} style={{ color: '#fff', margin: 0 }}>{selectedIncident.student?.firstName} {selectedIncident.student?.lastName}</Title>
                  <Text style={{ color: '#94a3b8' }}>{selectedIncident.student?.phone}</Text>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color="error">{selectedIncident.category}</Tag>
                <Tag color={selectedIncident.severity === 'CRITICAL' ? 'red' : selectedIncident.severity === 'HIGH' ? 'orange' : 'blue'}>
                  {selectedIncident.severity}
                </Tag>
                <Tag>{selectedIncident.status}</Tag>
              </div>
            </div>

            {selectedIncident.description && (
              <Card size="small" title="Description" style={{ marginBottom: 16 }}>
                <Text style={{ color: '#94a3b8' }}>{selectedIncident.description}</Text>
              </Card>
            )}

            <Card size="small" title="Emergency Details & Telemetry" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><Text style={{ color: '#94a3b8' }}>Student Name: </Text><Text strong style={{ color: '#fff' }}>{selectedIncident.student?.firstName} {selectedIncident.student?.lastName}</Text></div>
                <div><Text style={{ color: '#94a3b8' }}>Emergency: </Text><Tag color="error">{selectedIncident.category}</Tag></div>
                <div><Text style={{ color: '#94a3b8' }}>Phone: </Text><Text strong style={{ color: '#fff' }}>{selectedIncident.student?.phone}</Text></div>
                <div><Text style={{ color: '#94a3b8' }}>Coordinates: </Text><Text style={{ color: '#6366f1' }}>{selectedIncident.latitude.toFixed(5)}, {selectedIncident.longitude.toFixed(5)}</Text></div>
                <div><Text style={{ color: '#94a3b8' }}>Status: </Text><Tag color="processing">LIVE TRACKING ACTIVE</Tag></div>
              </div>
            </Card>

            <Card size="small" title="Live Navigation Track" style={{ marginBottom: 16 }}>
              <LiveCampusMap
                studentLocation={{ lat: selectedIncident.latitude, lng: selectedIncident.longitude }}
                guardLocation={currentGuardLocation}
                studentName={selectedIncident.student ? `${selectedIncident.student.firstName} ${selectedIncident.student.lastName}` : 'Student (SOS)'}
                guardName={user ? `${user.firstName} ${user.lastName}` : 'Security Responder'}
                buildings={buildings}
                safeZones={safeZones}
                height="220px"
              />
              <div style={{ marginTop: 12 }}>
                <Button 
                  type="primary" 
                  block 
                  icon={<EnvironmentOutlined />}
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedIncident.latitude},${selectedIncident.longitude}`, '_blank')}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                >
                  Navigate to Student
                </Button>
              </div>
            </Card>

            {/* Submitted Evidence Log */}
            {evidenceList.length > 0 && (
              <Card size="small" title="📸 Submitted Evidence Log" style={{ marginBottom: 16 }}>
                <List
                  dataSource={evidenceList}
                  size="small"
                  renderItem={(e: any) => (
                    <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #27272a' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Tag color="purple">{e.type}</Tag>
                            <Text strong style={{ color: '#fff', fontSize: 13 }}>{e.fileName}</Text>
                          </div>
                          <Button 
                            size="small" 
                            type="link" 
                            onClick={() => {
                              const baseUrl = import.meta.env.VITE_API_URL 
                                ? import.meta.env.VITE_API_URL.replace('/api', '') 
                                : 'http://localhost:5000';
                              const fullUrl = e.url.startsWith('http') ? e.url : `${baseUrl}${e.url}`;
                              window.open(fullUrl, '_blank');
                            }}
                          >
                            View
                          </Button>
                        </div>
                        {e.caption && <Text style={{ color: '#a1a1aa', fontSize: 11, marginTop: 4 }}>"{e.caption}"</Text>}
                        <Text style={{ color: '#71717a', fontSize: 10 }}>Uploaded by: {e.uploader?.firstName} {e.uploader?.lastName}</Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Card size="small" title="AI Analysis" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94a3b8' }}>Threat Score</Text>
                <Text strong style={{ color: (selectedIncident.aiThreatScore || 0) >= 70 ? '#ef4444' : '#f59e0b' }}>
                  {selectedIncident.aiThreatScore || 0}/100
                </Text>
              </div>
              {selectedIncident.isFakeSOS && (
                <Tag color="warning" style={{ marginTop: 8 }}>⚠️ Flagged as potential false alarm</Tag>
              )}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedIncident.status === 'PENDING' && (
                <Button type="primary" block onClick={() => handleAccept(selectedIncident.id)} style={{ background: '#10b981', borderColor: '#10b981' }}>
                  Accept Incident
                </Button>
              )}
              {['ASSIGNED', 'IN_PROGRESS'].includes(selectedIncident.status) && (
                <>
                  <Button block onClick={() => handleUpdateStatus(selectedIncident.id, 'ON_THE_WAY')} icon={<CarOutlined />} loading={statusLoading}>
                    On The Way
                  </Button>
                  <Button block onClick={() => handleUpdateStatus(selectedIncident.id, 'REACHED')} icon={<EnvironmentOutlined />} loading={statusLoading}>
                    Reached Location
                  </Button>
                </>
              )}
              {['ON_THE_WAY', 'REACHED'].includes(selectedIncident.status) && (
                <Button type="primary" block onClick={() => handleUpdateStatus(selectedIncident.id, 'RESOLVED')} icon={<CheckCircleOutlined />} loading={statusLoading} style={{ background: '#10b981', borderColor: '#10b981' }}>
                  Mark Resolved
                </Button>
              )}
              <Button block icon={<MessageOutlined />} onClick={() => navigate(`/incident/${selectedIncident.id}`)}>
                Open Chat
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Notification Drawer */}
      <Drawer
        title="Notifications"
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        width={360}
      >
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <BellOutlined style={{ fontSize: 40, marginBottom: 16 }} />
            <br />No notifications
          </div>
        ) : (
          <List
            dataSource={notifications}
            renderItem={(n: any) => (
               <List.Item style={{ opacity: n.isRead ? 0.6 : 1 }}>
                 <List.Item.Meta
                   avatar={<BellOutlined style={{ color: '#6366f1', fontSize: 18 }} />}
                   title={<Text style={{ color: '#fff' }}>{n.title}</Text>}
                   description={
                     <>
                       <Text style={{ color: '#94a3b8', fontSize: 13 }}>{n.message}</Text>
                       <br />
                       <Text style={{ color: '#64748b', fontSize: 11 }}>{new Date(n.createdAt).toLocaleString()}</Text>
                     </>
                   }
                 />
               </List.Item>
            )}
          />
        )}
      </Drawer>
    </Layout>
  );
}
