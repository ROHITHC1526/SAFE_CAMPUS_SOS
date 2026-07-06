import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Badge, Avatar, Modal, Select, message, Card, Row, Col, Tag, List, Drawer, Input, Form, Tooltip, Statistic, Alert } from 'antd';
import { motion } from 'framer-motion';
import {
  SafetyCertificateOutlined, DashboardOutlined, AlertOutlined, HistoryOutlined,
  PhoneOutlined, SettingOutlined, BellOutlined, LogoutOutlined, UserOutlined,
  HeartOutlined, TeamOutlined, MessageOutlined,
  MedicineBoxOutlined, SendOutlined, ClockCircleOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, WarningOutlined, FireOutlined, ThunderboltOutlined,
  AimOutlined, HomeOutlined, PlusOutlined, DeleteOutlined, KeyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { incidentAPI, userAPI, notificationAPI, settingsAPI, buildingAPI } from '../services/api';
import LiveCampusMap from '../components/LiveCampusMap';

const { Sider, Content, Header } = Layout;
const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const emergencyCategories = [
  { value: 'MEDICAL', label: '🏥 Medical Emergency', color: '#ef4444', icon: <MedicineBoxOutlined /> },
  { value: 'FIRE', label: '🔥 Fire', color: '#f97316', icon: <FireOutlined /> },
  { value: 'HARASSMENT', label: '⚠️ Harassment', color: '#eab308', icon: <WarningOutlined /> },
  { value: 'RAGGING', label: '🚫 Ragging', color: '#a855f7', icon: <ExclamationCircleOutlined /> },
  { value: 'ACCIDENT', label: '🚨 Accident', color: '#ec4899', icon: <AlertOutlined /> },
  { value: 'THEFT', label: '🔒 Theft', color: '#6366f1', icon: <AimOutlined /> },
  { value: 'VIOLENCE', label: '🛡️ Violence', color: '#dc2626', icon: <ThunderboltOutlined /> },
  { value: 'OTHER', label: '📋 Other', color: '#64748b', icon: <ExclamationCircleOutlined /> },
];

const getStatusColor = (status: string) => {
  const map: Record<string, string> = { PENDING: 'warning', ASSIGNED: 'processing', IN_PROGRESS: 'processing', RESOLVED: 'success', CANCELLED: 'default' };
  return map[status] || 'default';
};

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sosDescription, setSosDescription] = useState('');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [sosHoldTimer, setSosHoldTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [medicalProfile, setMedicalProfile] = useState<any>(null);
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);

  // Map and active tracker state
  const [buildings, setBuildings] = useState<any[]>([]);
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [activeGuardLocation, setActiveGuardLocation] = useState<{ lat: number; lng: number } | null>(null);

  // GPS & Live sharing telemetry state
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLiveSharing, setIsLiveSharing] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [gpsLastUpdated, setGpsLastUpdated] = useState<Date | null>(null);
  const [batteryFriendly, setBatteryFriendly] = useState<boolean>(true);

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'CANCELLED', 'FALSE_ALARM'].includes(i.status));

  // Fetch data
  useEffect(() => {
    loadIncidents();
    loadNotifications();
    loadContacts();
    loadProfile();
    loadMapData();
    getCurrentLocation();
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('incident:updated', (data: any) => {
      message.info(`Incident updated: ${data.status}`);
      loadIncidents();
      if (['RESOLVED', 'CANCELLED', 'FALSE_ALARM'].includes(data.status)) {
        setIsLiveSharing(false);
      }
    });

    socket.on('incident:accepted', (data: any) => {
      message.success('Security is on the way!');
      loadIncidents();
    });

    socket.on('sos:new', () => loadNotifications());

    // Listen to new notifications in real-time
    socket.on('notification:new', (data: any) => {
      message.info(`🔔 ${data.title}: ${data.message}`);
      loadNotifications();
    });

    // Listen to resolved event to deactivate live tracking
    socket.on('incident:resolved', () => {
      setIsLiveSharing(false);
      message.success('Emergency resolved. Location sharing stopped.');
      loadIncidents();
    });

    // Listen for guard real-time locations during an active SOS
    socket.on('location:update', (data: any) => {
      if (data.role === 'SECURITY') {
        setActiveGuardLocation({ lat: data.latitude, lng: data.longitude });
      }
    });

    return () => {
      socket.off('incident:updated');
      socket.off('incident:accepted');
      socket.off('sos:new');
      socket.off('notification:new');
      socket.off('incident:resolved');
      socket.off('location:update');
    };
  }, [socket]);

  const loadMapData = async () => {
    try {
      const [bRes, szRes] = await Promise.all([
        buildingAPI.getAll(),
        buildingAPI.getSafeZones()
      ]);
      setBuildings(bRes.data.data);
      setSafeZones(szRes.data.data);
    } catch {}
  };

  const lastEmitTimeRef = useRef<number>(0);

  const requestGPSPermission = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setGpsError('Geolocation is not supported by your browser.');
        setGpsPermissionStatus('denied');
        reject(new Error('Not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPermissionStatus('granted');
          setGpsError(null);
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentLocation(coords);
          setGpsAccuracy(pos.coords.accuracy);
          setGpsSpeed(pos.coords.speed);
          setGpsHeading(pos.coords.heading);
          setGpsLastUpdated(new Date());
          resolve(coords);
        },
        (err) => {
          setGpsPermissionStatus('denied');
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Location access is required during emergencies.');
          } else {
            setGpsError('Failed to retrieve location. Please check your GPS settings.');
          }
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const getCurrentLocation = async () => {
    try {
      await requestGPSPermission();
    } catch {
      // Fallback default coordinates
      setCurrentLocation({ lat: 16.4420, lng: 80.6225 });
    }
  };

  // Real-time persistent location streaming hook for active emergencies & manual sharing
  useEffect(() => {
    const shouldTrack = activeIncidents.length > 0 || isLiveSharing;
    if (!socket || !shouldTrack) return;

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your device.');
      setGpsPermissionStatus('denied');
      return;
    }

    const activeIncident = activeIncidents[0];
    const incidentId = activeIncident ? activeIncident.id : 'manual_share';

    // Notify socket start session
    socket.emit('location:start', { incidentId });

    message.success('📡 Continuous real-time location tracking activated.');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPermissionStatus('granted');
        setGpsError(null);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const speed = pos.coords.speed;
        const heading = pos.coords.heading;

        const coords = { lat, lng };
        setCurrentLocation(coords);
        setGpsAccuracy(accuracy);
        setGpsSpeed(speed);
        setGpsHeading(heading);
        setGpsLastUpdated(new Date());

        // Emit location update every 3-5 seconds (Battery Friendly throttling)
        const now = Date.now();
        if (now - lastEmitTimeRef.current >= 3000) {
          lastEmitTimeRef.current = now;
          socket.emit('location:update', {
            latitude: lat,
            longitude: lng,
            accuracy,
            speed,
            heading,
            incidentId,
          });
        }
      },
      (err) => {
        console.error('GPS Watch Error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermissionStatus('denied');
          setGpsError('Location access is required during emergencies.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.emit('location:stop', { incidentId });
    };
  }, [socket, activeIncidents.length, isLiveSharing]);

  const loadIncidents = async () => {
    try {
      const res = await incidentAPI.getAll({ limit: 50 });
      setIncidents(res.data.data.incidents);
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getAll({ limit: 20 });
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unread);
    } catch {}
  };

  const loadContacts = async () => {
    try {
      const res = await userAPI.getEmergencyContacts();
      setContacts(res.data.data);
    } catch {}
  };

  const loadProfile = async () => {
    try {
      const res = await userAPI.getProfile();
      setMedicalProfile(res.data.data.medicalProfile);
    } catch {}
  };

  // SOS Long Press handlers
  const handleSOSDown = useCallback(() => {
    let progress = 0;
    const timer = setInterval(() => {
      progress += 2;
      setSosHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(timer);
        setSosModalOpen(true);
        setSosHoldProgress(0);
      }
    }, 30);
    setSosHoldTimer(timer);
  }, []);

  const handleSOSUp = useCallback(() => {
    if (sosHoldTimer) {
      clearInterval(sosHoldTimer);
      setSosHoldTimer(null);
    }
    if (sosHoldProgress < 100) {
      setSosHoldProgress(0);
    }
  }, [sosHoldTimer, sosHoldProgress]);

  // Trigger SOS
  const triggerSOS = async () => {
    if (!selectedCategory) {
      message.warning('Please select emergency type');
      return;
    }

    setSosLoading(true);
    try {
      // 1. Automatically request browser/mobile GPS permission.
      message.loading({ content: 'Requesting precise GPS coordinates...', key: 'gps_req' });
      let loc;
      try {
        loc = await requestGPSPermission();
        message.success({ content: 'GPS Location acquired.', key: 'gps_req' });
      } catch (err) {
        message.error({ content: 'Location access is required during emergencies.', key: 'gps_req' });
        // Abort the SOS trigger if permission is denied
        return;
      }

      // 2. Create the SOS with acquired coordinates
      const res = await incidentAPI.createSOS({
        category: selectedCategory,
        latitude: loc.lat,
        longitude: loc.lng,
        description: sosDescription,
        address: 'Campus Location',
      });

      message.success('SOS sent! Help is on the way!');
      setSosModalOpen(false);
      setSelectedCategory('');
      setSosDescription('');
      loadIncidents();

      // Join incident room for real-time updates
      if (socket) {
        socket.emit('incident:join', res.data.data.id);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to send SOS');
    } finally {
      setSosLoading(false);
    }
  };

  // Add emergency contact
  const handleAddContact = async (values: any) => {
    try {
      await userAPI.addEmergencyContact(values);
      message.success('Contact added!');
      setContactModalOpen(false);
      loadContacts();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to add contact');
    }
  };

  // Delete contact
  const handleDeleteContact = async (id: string) => {
    try {
      await userAPI.deleteEmergencyContact(id);
      message.success('Contact deleted');
      loadContacts();
    } catch {
      message.error('Failed to delete contact');
    }
  };

  // Toggle contact primary
  const handleTogglePrimary = async (c: any) => {
    try {
      await userAPI.updateEmergencyContact(c.id, { ...c, isPrimary: !c.isPrimary });
      message.success('Emergency contact updated');
      loadContacts();
    } catch {
      message.error('Failed to update contact');
    }
  };

  // Update medical profile
  const handleUpdateMedical = async (values: any) => {
    try {
      await userAPI.updateMedical({
        ...values,
        allergies: values.allergies ? values.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        diseases: values.diseases ? values.diseases.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        medications: values.medications ? values.medications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      });
      message.success('Medical profile updated!');
      setMedicalModalOpen(false);
      loadProfile();
    } catch {
      message.error('Failed to update medical profile');
    }
  };

  // Handle Logout & Navigate to Landing
  const handleLogout = () => {
    logout();
    navigate('/');
    message.success('Logged out successfully');
  };

  const menuItems = [
    { key: '/student', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/student/map', icon: <AimOutlined />, label: 'Campus Map' },
    { key: '/student/incidents', icon: <HistoryOutlined />, label: 'My Incidents' },
    { key: '/student/contacts', icon: <TeamOutlined />, label: 'Emergency Contacts' },
    { key: '/student/medical', icon: <HeartOutlined />, label: 'Medical Info' },
    { key: '/student/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  // ─── Render Sub-Views ──────────────────────────────────────────

  const DashboardHome = () => (
    <>
      {/* SOS Button Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', padding: '40px 0' }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <motion.button
            className="sos-button"
            onMouseDown={handleSOSDown}
            onMouseUp={handleSOSUp}
            onMouseLeave={handleSOSUp}
            onTouchStart={handleSOSDown}
            onTouchEnd={handleSOSUp}
            whileTap={{ scale: 0.95 }}
            style={{ position: 'relative' }}
          >
            SOS
            {sosHoldProgress > 0 && (
              <svg style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', transform: 'rotate(-90deg)' }}>
                <circle
                  cx="50%" cy="50%" r="48%"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeDasharray={`${sosHoldProgress * 3.14} 314`}
                  opacity={0.8}
                />
              </svg>
            )}
          </motion.button>
        </div>
        <div style={{ marginTop: 16 }}>
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>Press and hold for emergency SOS</Text>
        </div>
      </motion.div>

      {/* GPS Permission Warning Banner */}
      {gpsPermissionStatus === 'denied' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ marginBottom: 24 }}>
          <Alert
            message={<span style={{ fontWeight: 700, color: '#ef4444' }}>Location Access Required</span>}
            description={
              <div>
                <Text style={{ color: '#94a3b8', display: 'block', marginBottom: 12 }}>
                  {gpsError || 'SafeCampus AI requires GPS location access during active emergencies to guide responder response.'}
                </Text>
                <Button
                  type="primary"
                  danger
                  icon={<ReloadOutlined />}
                  onClick={() => requestGPSPermission()}
                >
                  Retry Request Location
                </Button>
              </div>
            }
            type="error"
            showIcon
            style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: 16 }}
          />
        </motion.div>
      )}

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 24 }}>
          <Card
            title={<span style={{ color: '#ef4444', fontWeight: 700 }}>🚨 Active Emergencies</span>}
            style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            {activeIncidents.map((inc) => (
              <div key={inc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16, marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/incident/${inc.id}`)}
                >
                  <div>
                    <Text strong style={{ color: '#fff' }}>{inc.category}</Text>
                    <br />
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(inc.createdAt).toLocaleString()}</Text>
                  </div>
                  <Tag color={getStatusColor(inc.status)}>{inc.status}</Tag>
                </div>
                {/* Live location tracker on active emergency card */}
                <div style={{ marginTop: 8 }}>
                  <LiveCampusMap
                    studentLocation={currentLocation}
                    guardLocation={activeGuardLocation}
                    studentName={user ? `${user.firstName} ${user.lastName}` : 'Student'}
                    guardName={inc.assignments?.[0]?.responder ? `${inc.assignments[0].responder.firstName} ${inc.assignments[0].responder.lastName}` : 'Security Responder'}
                    buildings={buildings}
                    safeZones={safeZones}
                    height="240px"
                  />
                  <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginTop: 8 }}>
                    📍 Tracking your real-time position and approaching security responder...
                  </Text>
                </div>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {/* Manual Live Location Sharing Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <Card
          title={<span style={{ color: '#6366f1', fontSize: 16, fontWeight: 700 }}>📡 GPS Live Location Grid</span>}
          extra={
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {(isLiveSharing || activeIncidents.length > 0) && (
                <Tag color="success" style={{ padding: '4px 8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)' }}>
                  Live Location Active
                </Tag>
              )}
              <Button
                type={isLiveSharing ? 'primary' : 'default'}
                danger={isLiveSharing}
                onClick={async () => {
                  if (!isLiveSharing) {
                    try {
                      await requestGPSPermission();
                      setIsLiveSharing(true);
                      message.success('Live location sharing activated manually');
                    } catch {
                      message.error('Please grant GPS permission to share live location');
                    }
                  } else {
                    setIsLiveSharing(false);
                    message.info('Live location sharing stopped manually');
                  }
                }}
              >
                {isLiveSharing ? 'Turn OFF Live Share' : 'Share Live Location'}
              </Button>
            </div>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="GPS Accuracy"
                value={gpsAccuracy ? `${gpsAccuracy.toFixed(1)} m` : '--'}
                valueStyle={{ color: '#fff', fontSize: 16 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Speed"
                value={gpsSpeed ? `${(gpsSpeed * 3.6).toFixed(1)} km/h` : 'Stationary'}
                valueStyle={{ color: '#fff', fontSize: 16 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Last Updated"
                value={gpsLastUpdated ? gpsLastUpdated.toLocaleTimeString() : '--'}
                valueStyle={{ color: '#fff', fontSize: 16 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Battery Friendly Mode"
                value="Throttled (3-5s)"
                valueStyle={{ color: '#10b981', fontSize: 14 }}
                prefix={<CheckCircleOutlined style={{ fontSize: 14, color: '#10b981' }} />}
              />
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Incidents', value: incidents.length, icon: <AlertOutlined />, color: '#6366f1' },
          { title: 'Active', value: activeIncidents.length, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
          { title: 'Resolved', value: incidents.filter(i => i.status === 'RESOLVED').length, icon: <CheckCircleOutlined />, color: '#10b981' },
          { title: 'Contacts', value: contacts.length, icon: <TeamOutlined />, color: '#06b6d4' },
        ].map((stat, i) => (
          <Col xs={12} sm={6} key={i}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>{stat.title}</Text>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 4 }}>{stat.value}</div>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${stat.color}15`, color: stat.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          {/* Recent Incidents */}
          <Card title="Recent Incidents" extra={<Button type="link" onClick={() => navigate('/student/incidents')}>View All</Button>} style={{ height: '100%' }}>
            {incidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <SafetyCertificateOutlined style={{ fontSize: 48, color: '#2a2a4a', marginBottom: 16 }} />
                <br />No incidents reported. Stay safe!
              </div>
            ) : (
              <List
                dataSource={incidents.slice(0, 5)}
                renderItem={(item: any) => (
                  <List.Item
                    style={{ cursor: 'pointer', padding: '12px 0' }}
                    onClick={() => navigate(`/incident/${item.id}`)}
                    actions={[<Tag color={getStatusColor(item.status)}>{item.status}</Tag>]}
                  >
                    <List.Item.Meta
                      avatar={<div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {emergencyCategories.find(c => c.value === item.category)?.label?.slice(0, 2) || '📋'}
                      </div>}
                      title={<Text style={{ color: '#fff' }}>{item.title}</Text>}
                      description={<Text style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(item.createdAt).toLocaleString()} · Severity: {item.severity}</Text>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          {/* Emergency Contacts Preview */}
          <Card
            title="Emergency Contacts"
            extra={<Button type="primary" ghost size="small" onClick={() => setContactModalOpen(true)}>Add Contact</Button>}
            style={{ height: '100%' }}
          >
            {contacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                No emergency contacts added yet.
              </div>
            ) : (
              <List
                dataSource={contacts.slice(0, 4)}
                renderItem={(c: any) => (
                  <List.Item actions={[
                    c.isPrimary && <Tag color="blue">Primary</Tag>,
                    <Tag>{c.relation}</Tag>,
                  ]}>
                    <List.Item.Meta
                      avatar={<Avatar style={{ background: '#6366f1' }}>{c.name[0]}</Avatar>}
                      title={<Text style={{ color: '#fff' }}>{c.name}</Text>}
                      description={<Text style={{ color: '#94a3b8' }}>{c.phone}</Text>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );

  const IncidentsView = () => (
    <Card title="Incident History">
      {incidents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <HistoryOutlined style={{ fontSize: 48, color: '#2a2a4a', marginBottom: 16 }} />
          <br />No incidents reported.
        </div>
      ) : (
        <List
          dataSource={incidents}
          pagination={{ pageSize: 10 }}
          renderItem={(item: any) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '16px' }}
              onClick={() => navigate(`/incident/${item.id}`)}
              actions={[
                <Tag color={getStatusColor(item.status)}>{item.status}</Tag>,
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>View Details</Text>
              ]}
            >
              <List.Item.Meta
                avatar={<div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {emergencyCategories.find(c => c.value === item.category)?.label?.slice(0, 2) || '📋'}
                </div>}
                title={<Text style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{item.title}</Text>}
                description={
                  <div>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                      {new Date(item.createdAt).toLocaleString()} · Severity: <span className={`severity-badge ${item.severity.toLowerCase()}`} style={{ display: 'inline-block', scale: '0.85' }}>{item.severity}</span>
                    </Text>
                    {item.description && <Paragraph style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{item.description}</Paragraph>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const ContactsView = () => (
    <Card
      title="Manage Emergency Contacts"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setContactModalOpen(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none' }}>
          Add Contact
        </Button>
      }
    >
      {contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <TeamOutlined style={{ fontSize: 48, color: '#2a2a4a', marginBottom: 16 }} />
          <br />No emergency contacts added yet. Click "Add Contact" to start.
        </div>
      ) : (
        <List
          dataSource={contacts}
          renderItem={(c: any) => (
            <List.Item
              actions={[
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteContact(c.id)} />,
                <Button type="link" onClick={() => handleTogglePrimary(c)}>
                  {c.isPrimary ? 'Unset Primary' : 'Make Primary'}
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar size="large" style={{ background: '#6366f1' }}>{c.name[0]}</Avatar>}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: 600 }}>{c.name}</Text>
                    {c.isPrimary && <Tag color="blue">Primary</Tag>}
                    <Tag color="purple">{c.relation}</Tag>
                  </div>
                }
                description={
                  <div>
                    <Text style={{ color: '#94a3b8' }}>📞 {c.phone}</Text>
                    {c.email && <Text style={{ color: '#64748b', marginLeft: 16 }}>✉️ {c.email}</Text>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const MedicalView = () => (
    <Card
      title="My Medical Profile"
      extra={
        <Button type="primary" ghost icon={<SettingOutlined />} onClick={() => setMedicalModalOpen(true)}>
          Edit Profile
        </Button>
      }
    >
      <div style={{ padding: '8px 0' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 12, border: '1px solid #2a2a4a', textAlign: 'center' }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>BLOOD GROUP</Text>
              <Text style={{ color: '#ef4444', fontSize: 36, fontWeight: 800 }}>{medicalProfile?.bloodGroup || 'Not set'}</Text>
            </div>
          </Col>
          <Col xs={24} md={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>ALLERGIES</Text>
                {medicalProfile?.allergies?.length > 0 ? (
                  medicalProfile.allergies.map((a: string) => <Tag color="red" key={a}>{a}</Tag>)
                ) : (
                  <Text style={{ color: '#64748b', fontStyle: 'italic' }}>None listed</Text>
                )}
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>MEDICAL CONDITIONS</Text>
                {medicalProfile?.diseases?.length > 0 ? (
                  medicalProfile.diseases.map((d: string) => <Tag color="warning" key={d}>{d}</Tag>)
                ) : (
                  <Text style={{ color: '#64748b', fontStyle: 'italic' }}>None listed</Text>
                )}
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>ACTIVE MEDICATIONS</Text>
                {medicalProfile?.medications?.length > 0 ? (
                  medicalProfile.medications.map((m: string) => <Tag color="blue" key={m}>{m}</Tag>)
                ) : (
                  <Text style={{ color: '#64748b', fontStyle: 'italic' }}>None listed</Text>
                )}
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>EMERGENCY INSTRUCTIONS / NOTES</Text>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid #2a2a4a' }}>
                  <Text style={{ color: '#e2e8f0' }}>{medicalProfile?.emergencyNotes || 'No notes added'}</Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );

  const SettingsView = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const onFinish = async (values: any) => {
      setLoading(true);
      try {
        await userAPI.updateProfile(values);
        message.success('Profile updated successfully');
        loadProfile();
      } catch {
        message.error('Failed to update profile');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Card title="Account Settings">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            firstName: user?.firstName,
            lastName: user?.lastName,
            phone: user?.phone,
          }}
          style={{ maxWidth: 480 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="phone" label="Phone Number">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none' }}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    );
  };

  const MapView = () => (
    <Card title={<span style={{ color: '#6366f1' }}>🛡️ LBRCE Live Campus Map Grid</span>}>
      <LiveCampusMap
        studentLocation={currentLocation}
        guardLocation={activeGuardLocation}
        studentName={user ? `${user.firstName} ${user.lastName}` : 'Student'}
        guardName="Security Responder"
        buildings={buildings}
        safeZones={safeZones}
        height="500px"
      />
      <div style={{ marginTop: 12 }}>
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
          📍 Red pulse: Your location · 🔵 Blue pulse: Approaching Security Responder (active during SOS)
        </Text>
      </div>
    </Card>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      <Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={0}
        style={{ background: '#111128', borderRight: '1px solid #2a2a4a', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}
        width={260}
      >
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #2a2a4a', marginBottom: 8 }}>
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#6366f1' }} />
          {!collapsed && <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Safe<span style={{ color: '#6366f1' }}>Campus</span></span>}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{ background: 'transparent', border: 'none' }}
        />

        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            style={{ color: '#94a3b8', textAlign: 'left', justifyContent: 'flex-start' }}
          >
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 0 : 260, transition: 'margin 0.2s', background: '#0a0a1a' }}>
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
          height: 64,
        }}>
          {/* Aligned welcome back header layout */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: 12, lineHeight: '1.2' }}>Welcome back,</span>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: '1.2', marginTop: 2 }}>{user?.firstName} {user?.lastName}</span>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Back to Home Button */}
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
              style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              Back to Home
            </Button>

            {/* Logout Button */}
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}
            >
              Logout
            </Button>

            <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }} />
            </Tooltip>
            <Badge count={unreadCount} size="small">
              <Button type="text" icon={<BellOutlined style={{ fontSize: 20, color: '#94a3b8' }} />} onClick={() => setNotifDrawerOpen(true)} />
            </Badge>
            <Avatar style={{ background: '#6366f1' }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Avatar>
          </div>
        </Header>

        <Content style={{ padding: 24 }}>
          {/* Sub-routing configuration inside Content block */}
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/incidents" element={<IncidentsView />} />
            <Route path="/contacts" element={<ContactsView />} />
            <Route path="/medical" element={<MedicalView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </Content>
      </Layout>

      {/* SOS Modal */}
      <Modal
        open={sosModalOpen}
        onCancel={() => { setSosModalOpen(false); setSelectedCategory(''); }}
        footer={null}
        title={<span style={{ color: '#ef4444', fontSize: 20, fontWeight: 700 }}>🚨 Emergency SOS</span>}
        width={480}
        centered
      >
        <div style={{ padding: '16px 0' }}>
          <Text style={{ color: '#94a3b8', display: 'block', marginBottom: 16 }}>Select emergency type:</Text>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {emergencyCategories.map((cat) => (
              <motion.div
                key={cat.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(cat.value)}
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: selectedCategory === cat.value ? `${cat.color}15` : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${selectedCategory === cat.value ? cat.color : 'rgba(255,255,255,0.06)'}`,
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{cat.label.slice(0, 2)}</div>
                <Text style={{ color: selectedCategory === cat.value ? cat.color : '#94a3b8', fontWeight: 600, fontSize: 13 }}>
                  {cat.label.slice(3)}
                </Text>
              </motion.div>
            ))}
          </div>

          <TextArea
            placeholder="Describe the emergency (optional)"
            value={sosDescription}
            onChange={(e) => setSosDescription(e.target.value)}
            rows={3}
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, marginBottom: 20 }}
          />

          <Button
            type="primary"
            danger
            size="large"
            block
            loading={sosLoading}
            onClick={triggerSOS}
            style={{ height: 52, borderRadius: 12, fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg, #ef4444, #f97316)', border: 'none' }}
          >
            🚨 SEND SOS NOW
          </Button>

          <Text style={{ color: '#64748b', fontSize: 11, display: 'block', textAlign: 'center', marginTop: 12 }}>
            This will notify security, admin, and your emergency contacts immediately.
          </Text>
        </div>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        open={contactModalOpen}
        onCancel={() => setContactModalOpen(false)}
        footer={null}
        title="Add Emergency Contact"
      >
        <Form layout="vertical" onFinish={handleAddContact}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Contact name" />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
            <Input placeholder="Phone number" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="Email (optional)" />
          </Form.Item>
          <Form.Item name="relation" label="Relation" rules={[{ required: true }]}>
            <Select options={[
              { value: 'PARENT', label: 'Parent' },
              { value: 'SIBLING', label: 'Sibling' },
              { value: 'FRIEND', label: 'Friend' },
              { value: 'FACULTY', label: 'Faculty' },
              { value: 'OTHER', label: 'Other' },
            ]} />
          </Form.Item>
          <Form.Item name="isPrimary" valuePropName="checked">
            <label><input type="checkbox" /> Set as primary contact</label>
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none' }}>
            Add Contact
          </Button>
        </Form>
      </Modal>

      {/* Medical Profile Modal */}
      <Modal
        open={medicalModalOpen}
        onCancel={() => setMedicalModalOpen(false)}
        footer={null}
        title="Medical Profile"
      >
        <Form
          layout="vertical"
          onFinish={handleUpdateMedical}
          initialValues={{
            bloodGroup: medicalProfile?.bloodGroup || '',
            allergies: medicalProfile?.allergies?.join(', ') || '',
            diseases: medicalProfile?.diseases?.join(', ') || '',
            medications: medicalProfile?.medications?.join(', ') || '',
            emergencyNotes: medicalProfile?.emergencyNotes || '',
          }}
        >
          <Form.Item name="bloodGroup" label="Blood Group">
            <Select options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="allergies" label="Allergies (comma separated)">
            <Input placeholder="e.g., Penicillin, Dust" />
          </Form.Item>
          <Form.Item name="diseases" label="Conditions (comma separated)">
            <Input placeholder="e.g., Asthma, Diabetes" />
          </Form.Item>
          <Form.Item name="medications" label="Medications (comma separated)">
            <Input placeholder="e.g., Inhaler" />
          </Form.Item>
          <Form.Item name="emergencyNotes" label="Emergency Notes">
            <TextArea rows={3} placeholder="Any additional notes for first responders" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Save</Button>
        </Form>
      </Modal>

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
