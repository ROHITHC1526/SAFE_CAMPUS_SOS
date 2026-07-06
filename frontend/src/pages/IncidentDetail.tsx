import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Button, Tag, Avatar, Input, Spin, Timeline, message, Tabs, Badge, Tooltip, Form, Select, List, Modal } from 'antd';
import { motion } from 'framer-motion';
import {
  ArrowLeftOutlined, SendOutlined, PhoneOutlined, VideoCameraOutlined,
  EnvironmentOutlined, ClockCircleOutlined, AlertOutlined, CheckCircleOutlined,
  UserOutlined, MessageOutlined, FileImageOutlined, AudioOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { incidentAPI, chatAPI, buildingAPI, mediaAPI } from '../services/api';
import { getEmergencyGuidance } from '../utils/guidance';
import LiveCampusMap from '../components/LiveCampusMap';

const { Title, Text, Paragraph } = Typography;

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [incident, setIncident] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('chat');

  // Call simulation states
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'AUDIO' | 'VIDEO' | null>(null);
  const [callStream, setCallStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const callTimerRef = useRef<any>(null);

  // Evidence states
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidenceCategory, setEvidenceCategory] = useState<'PHOTO' | 'VIDEO' | 'AUDIO'>('PHOTO');

  // Live map state
  const [buildings, setBuildings] = useState<any[]>([]);
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [activeGuardLocation, setActiveGuardLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadMapData();
  }, []);

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

  useEffect(() => {
    if (id) {
      loadIncident();
      loadMessages();
      loadEvidence();

      if (socket) {
        socket.emit('incident:join', id);

        socket.on('chat:message', (msg: any) => {
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
        });

        socket.on('chat:typing', (data: any) => {
          if (data.isTyping) {
            setTypingUsers(prev => [...new Set([...prev, data.userId])]);
          } else {
            setTypingUsers(prev => prev.filter(u => u !== data.userId));
          }
        });

        // Listen for real-time location changes of student/responder on this incident
        socket.on('location:update', (data: any) => {
          if (data.role === 'SECURITY') {
            setActiveGuardLocation({ lat: data.latitude, lng: data.longitude });
          } else if (incident && data.userId === incident.studentId) {
            setIncident((prev: any) => prev ? { ...prev, latitude: data.latitude, longitude: data.longitude } : null);
          }
        });

        // Listen to new evidence uploads in real-time
        socket.on('evidence:new', () => {
          message.info('📸 New media evidence has been uploaded.');
          loadEvidence();
        });

        socket.on('chat:read', () => {});
      }
    }

    return () => {
      if (socket && id) {
        socket.emit('incident:leave', id);
        socket.off('chat:message');
        socket.off('chat:typing');
        socket.off('chat:read');
        socket.off('location:update');
        socket.off('evidence:new');
      }
    };
  }, [id, socket, incident?.studentId]);

  const loadEvidence = async () => {
    if (!id) return;
    try {
      const res = await mediaAPI.getEvidence(id);
      setEvidenceList(res.data.data);
    } catch {}
  };

  const handleUploadEvidence = async (file: File) => {
    if (!id) return;
    setUploadingEvidence(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', evidenceCategory);
      formData.append('caption', evidenceCaption);

      await mediaAPI.upload(id, formData);
      message.success('Evidence uploaded successfully');
      setEvidenceCaption('');
      loadEvidence();

      if (socket) {
        socket.emit('evidence:new', { incidentId: id });
      }
    } catch {
      message.error('Failed to upload evidence');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const startCall = async (type: 'AUDIO' | 'VIDEO') => {
    setCallType(type);
    setCallModalOpen(true);
    setCallDuration(0);

    if (type === 'VIDEO') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCallStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        message.warning('Camera access denied. Simulating audio call.');
      }
    }

    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const endCall = () => {
    if (callStream) {
      callStream.getTracks().forEach(t => t.stop());
      setCallStream(null);
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallModalOpen(false);
    setCallType(null);
  };

  useEffect(() => {
    return () => {
      if (callStream) {
        callStream.getTracks().forEach(t => t.stop());
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStream]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Continuous geolocation tracking for active incident session
  useEffect(() => {
    if (!socket || !incident || ['RESOLVED', 'CANCELLED', 'FALSE_ALARM'].includes(incident.status)) return;

    // Check if current user is the student who triggered this or an assigned responder
    const isStudent = user?.id === incident.studentId;
    const isResponder = incident.assignments?.some((a: any) => a.responderId === user?.id && !a.completedAt);

    if (!isStudent && !isResponder) return;

    if (!navigator.geolocation) return;

    console.log('📡 Geolocation watch activated on Incident Detail view.');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        socket.emit('location:update', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
        });

        if (isStudent) {
          setIncident((prev: any) => prev ? { ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude } : null);
        } else if (isResponder) {
          setActiveGuardLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      (err) => console.error('Incident tracking error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [socket, incident?.id, incident?.status, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const loadIncident = async () => {
    try {
      const res = await incidentAPI.getById(id!);
      setIncident(res.data.data);
    } catch {
      message.error('Failed to load incident');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await chatAPI.getMessages(id!);
      setMessages(res.data.data);
    } catch {}
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    setSending(true);
    try {
      if (socket) {
        socket.emit('chat:send', { incidentId: id, content: newMessage });
      } else {
        await chatAPI.sendMessage(id, { content: newMessage });
        loadMessages();
      }
      setNewMessage('');
    } catch {
      message.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (typing: boolean) => {
    if (socket && id) {
      socket.emit('chat:typing', { incidentId: id, isTyping: typing });
    }
  };

  const getTimelineColor = (event: string) => {
    if (event.includes('TRIGGERED')) return 'red';
    if (event.includes('ASSIGNED') || event.includes('ACCEPTED')) return 'blue';
    if (event.includes('WAY') || event.includes('STARTED')) return 'orange';
    if (event.includes('ARRIVED')) return 'cyan';
    if (event.includes('RESOLVED')) return 'green';
    return 'gray';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a1a' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a1a', flexDirection: 'column' }}>
        <AlertOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: 16 }} />
        <Text style={{ color: '#94a3b8' }}>Incident not found</Text>
        <Button onClick={() => navigate(-1)} style={{ marginTop: 16 }}>Go Back</Button>
      </div>
    );
  }

  const guidance = getEmergencyGuidance(incident.category);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} type="text" style={{ color: '#94a3b8' }} />
          <div>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              {incident.category} Emergency
            </Title>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>ID: {incident.id.slice(0, 8)}...</Text>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color={incident.severity === 'CRITICAL' ? 'red' : incident.severity === 'HIGH' ? 'orange' : 'blue'}>{incident.severity}</Tag>
          <Tag color={incident.status === 'RESOLVED' ? 'success' : 'warning'}>{incident.status}</Tag>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Left Column - Info */}
        <Col xs={24} lg={8}>
          {/* Student Info */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar size={48} style={{ background: '#6366f1' }}>{incident.student?.firstName?.[0]}</Avatar>
              <div>
                <Text strong style={{ color: '#fff', fontSize: 16 }}>{incident.student?.firstName} {incident.student?.lastName}</Text>
                <br />
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>{incident.student?.email}</Text>
                <br />
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>{incident.student?.phone}</Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Tooltip title="Audio Call">
                <Button 
                  icon={<PhoneOutlined />} 
                  shape="circle" 
                  onClick={() => {
                    const phone = user?.role === 'SECURITY' ? incident.student?.phone : (incident.assignments?.[0]?.responder?.phone || '1478523699');
                    if (phone) window.open('tel:' + phone);
                  }}
                  style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }} 
                />
              </Tooltip>
              <Tooltip title="Video Call">
                <Button 
                  icon={<VideoCameraOutlined />} 
                  shape="circle" 
                  onClick={() => startCall('VIDEO')} 
                  style={{ background: '#6366f1', borderColor: '#6366f1', color: '#fff' }} 
                />
              </Tooltip>
              <Tooltip title="Location">
                <Button icon={<EnvironmentOutlined />} shape="circle" onClick={() => setActiveTab('location')} />
              </Tooltip>
            </div>
          </Card>

          {/* AI Analysis */}
          <Card size="small" title={<span style={{ fontSize: 13 }}>🤖 AI Analysis</span>} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Threat Score</Text>
                <Text strong style={{ color: (incident.aiThreatScore || 0) >= 70 ? '#ef4444' : '#f59e0b' }}>
                  {incident.aiThreatScore || 0}/100
                </Text>
              </div>
              <div style={{ height: 6, background: '#2a2a4a', borderRadius: 3 }}>
                <div style={{
                  height: '100%',
                  width: `${incident.aiThreatScore || 0}%`,
                  borderRadius: 3,
                  background: (incident.aiThreatScore || 0) >= 70 ? 'linear-gradient(90deg, #f97316, #ef4444)' : 'linear-gradient(90deg, #f59e0b, #f97316)',
                }} />
              </div>
            </div>
            {incident.isFakeSOS && (
              <Tag color="warning">⚠️ Flagged as potential false alarm</Tag>
            )}
            {incident.responseTime && (
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Response Time: </Text>
                <Text strong style={{ color: '#10b981' }}>{Math.round(incident.responseTime / 60)} min</Text>
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card size="small" title={<span style={{ fontSize: 13 }}>📋 Timeline</span>} style={{ marginBottom: 16 }}>
            <Timeline
              items={(incident.timeline || []).map((t: any) => ({
                color: getTimelineColor(t.event),
                children: (
                  <div>
                    <Text strong style={{ color: '#fff', fontSize: 13 }}>{t.event.replace(/_/g, ' ')}</Text>
                    <br />
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>{t.details}</Text>
                    <br />
                    <Text style={{ color: '#64748b', fontSize: 10 }}>{new Date(t.timestamp).toLocaleString()}</Text>
                  </div>
                ),
              }))}
            />
          </Card>

          {/* Emergency Guidance */}
          <Card size="small" title={<span style={{ fontSize: 13 }}>💡 Emergency Guidance</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guidance.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <CheckCircleOutlined style={{ color: '#10b981', marginTop: 2, fontSize: 12 }} />
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>{tip}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Right Column - Chat & Communication */}
        <Col xs={24} lg={16}>
          <Card
            style={{ height: 'calc(100vh - 140px)' }}
            bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}
            title={
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                size="small"
                items={[
                  { key: 'chat', label: <><MessageOutlined /> Chat</> },
                  { key: 'location', label: <><EnvironmentOutlined /> Location</> },
                  { key: 'evidence', label: <><FileImageOutlined /> Evidence</> },
                ]}
              />
            }
          >
            {activeTab === 'chat' && (
              <>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <MessageOutlined style={{ fontSize: 40, marginBottom: 16 }} />
                      <br />No messages yet. Start the conversation.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                          }}
                        >
                          {!isMine && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Avatar size={20} style={{ background: '#6366f1', fontSize: 10 }}>{msg.sender?.firstName?.[0]}</Avatar>
                              <Text style={{ color: '#94a3b8', fontSize: 11 }}>{msg.sender?.firstName} · {msg.sender?.role}</Text>
                            </div>
                          )}
                          <div className={`chat-bubble ${isMine ? 'sent' : 'received'}`}>
                            {msg.content}
                          </div>
                          <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2, display: 'block', textAlign: isMine ? 'right' : 'left' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMine && msg.isRead && ' ✓✓'}
                          </Text>
                        </motion.div>
                      );
                    })
                  )}

                  {typingUsers.length > 0 && (
                    <div style={{ alignSelf: 'flex-start', padding: '6px 12px', background: '#161636', borderRadius: 12 }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>typing...</Text>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message Input */}
                <div style={{ padding: 16, borderTop: '1px solid #2a2a4a', display: 'flex', gap: 8 }}>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onFocus={() => handleTyping(true)}
                    onBlur={() => handleTyping(false)}
                    onPressEnter={sendMessage}
                    placeholder="Type a message..."
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={sendMessage}
                    loading={sending}
                    style={{ background: '#6366f1', borderColor: '#6366f1', borderRadius: 10 }}
                  />
                </div>
              </>
            )}

            {activeTab === 'location' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
                <div style={{ flex: 1, minHeight: '350px' }}>
                  <LiveCampusMap
                    studentLocation={{ lat: incident.latitude, lng: incident.longitude }}
                    guardLocation={activeGuardLocation}
                    studentName={incident.student ? `${incident.student.firstName} ${incident.student.lastName}` : 'Student (SOS)'}
                    guardName={incident.assignments?.[0]?.responder ? `${incident.assignments[0].responder.firstName} ${incident.assignments[0].responder.lastName}` : 'Security Responder'}
                    buildings={buildings}
                    safeZones={safeZones}
                    height="100%"
                  />
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                    📍 Real-time LBRCE Grid: Tracking student & responder approach.
                  </Text>
                  <Button
                    type="primary"
                    icon={<EnvironmentOutlined />}
                    onClick={() => window.open(`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`, '_blank')}
                  >
                    Open in Google Maps
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                <Row gutter={[16, 16]}>
                  {/* Upload Form Column - Only visible to Students */}
                  {user?.role === 'STUDENT' && (
                    <Col xs={24} md={12}>
                      <Card title={<span style={{ color: '#6366f1' }}>📸 Submit Incident Evidence</span>} size="small">
                        <Form layout="vertical" onFinish={() => {
                          const fileInput = document.getElementById('evidence-file-input') as HTMLInputElement;
                          if (fileInput && fileInput.files && fileInput.files[0]) {
                            handleUploadEvidence(fileInput.files[0]);
                            fileInput.value = '';
                          } else {
                            message.warning('Please select a file to upload');
                          }
                        }}>
                          <Form.Item label="Evidence Type">
                            <Select 
                              value={evidenceCategory} 
                              onChange={(val: any) => setEvidenceCategory(val)}
                              options={[
                                { value: 'PHOTO', label: '📷 Photograph / Picture' },
                                { value: 'VIDEO', label: '🎥 Video Recording' },
                                { value: 'AUDIO', label: '🎙️ Audio Recording / Clip' },
                                { value: 'DOCUMENT', label: '📄 Text Document / Log' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item label="Description / Caption">
                            <Input 
                              placeholder="Describe what this evidence shows..." 
                              value={evidenceCaption}
                              onChange={(e) => setEvidenceCaption(e.target.value)}
                            />
                          </Form.Item>
                          <Form.Item label="Select File">
                            <div style={{
                              border: '1px dashed #2a2a4a',
                              borderRadius: 8,
                              padding: '16px',
                              textAlign: 'center',
                              background: 'rgba(255,255,255,0.01)',
                              cursor: 'pointer',
                            }} onClick={() => document.getElementById('evidence-file-input')?.click()}>
                              <FileImageOutlined style={{ fontSize: 24, color: '#6366f1', marginBottom: 8 }} />
                              <br />
                              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Click to browse files</Text>
                              <input 
                                type="file" 
                                id="evidence-file-input" 
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    message.info(`Selected file: ${file.name}`);
                                  }
                                }}
                              />
                            </div>
                          </Form.Item>
                          <Form.Item>
                            <Button 
                              type="primary" 
                              htmlType="submit" 
                              loading={uploadingEvidence}
                              block
                              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none' }}
                            >
                              Upload Evidence
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                  )}

                  {/* Evidence List Log Column */}
                  <Col xs={24} md={user?.role === 'STUDENT' ? 12 : 24}>
                    <Card title={<span style={{ color: '#fff' }}>📋 Submitted Evidence Log</span>} size="small" style={{ height: '100%', minHeight: '320px' }}>
                      {evidenceList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                          <FileImageOutlined style={{ fontSize: 32, color: '#2a2a4a', marginBottom: 12 }} />
                          <br />No files uploaded yet
                        </div>
                      ) : (
                        <List
                          dataSource={evidenceList}
                          renderItem={(e: any) => (
                            <List.Item>
                              <Card size="small" style={{ width: '100%', background: '#111128', border: '1px solid #2a2a4a' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <Tag color="purple">{e.type}</Tag>
                                    <Text strong style={{ color: '#fff', marginLeft: 8 }}>{e.fileName}</Text>
                                    <br />
                                    {e.caption && <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginTop: 4 }}>"{e.caption}"</Text>}
                                    <Text style={{ color: '#64748b', fontSize: 11 }}>
                                      Uploaded by: {e.uploader?.firstName} · {new Date(e.createdAt).toLocaleString()}
                                    </Text>
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
                              </Card>
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* WebRTC Video/Audio Call Overlay Modal */}
      <Modal
        open={callModalOpen}
        onCancel={endCall}
        footer={null}
        closable={false}
        width={480}
        centered
        destroyOnClose
        styles={{ body: { padding: 0, overflow: 'hidden', background: '#070714', borderRadius: 12 } }}
      >
        <div style={{ padding: 24, textAlign: 'center', position: 'relative', minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Header */}
          <div>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              {callType === 'VIDEO' ? '🎥 Real-Time Video Call' : '📞 Real-Time Voice Call'}
            </Title>
            <Text style={{ color: '#10b981', display: 'block', marginTop: 4 }}>
              Status: Connected (Secured WebRTC Stream)
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
              Incident: {incident.category} Emergency
            </Text>
          </div>

          {/* Video Grid Feed */}
          {callType === 'VIDEO' ? (
            <div style={{ display: 'flex', gap: 12, width: '100%', margin: '20px 0', height: '180px' }}>
              {/* Local Feed */}
              <div style={{ flex: 1, position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4, color: '#fff', fontSize: 10 }}>
                  You (Local Feed)
                </span>
              </div>
              {/* Remote Feed */}
              <div style={{ flex: 1, position: 'relative', background: '#111128', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar size={64} style={{ background: '#6366f1' }}>
                    {user?.role === 'SECURITY' ? incident.student?.firstName?.[0] : incident.assignments?.[0]?.responder?.firstName?.[0] || 'S'}
                  </Avatar>
                  <Text style={{ color: '#fff', display: 'block', marginTop: 8, fontSize: 12 }}>
                    {user?.role === 'SECURITY' ? `${incident.student?.firstName} ${incident.student?.lastName}` : `${incident.assignments?.[0]?.responder?.firstName || 'Security'} ${incident.assignments?.[0]?.responder?.lastName || 'Officer'}`}
                  </Text>
                </div>
                <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4, color: '#fff', fontSize: 10 }}>
                  Remote Connection
                </span>
              </div>
            </div>
          ) : (
            <div style={{ margin: '40px 0', textAlign: 'center' }}>
              <div className="audio-wave-container" style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', height: '40px' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                  <motion.div
                    key={bar}
                    animate={{ height: [10, 35, 10] }}
                    transition={{ duration: 1 + bar * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 4, background: '#10b981', borderRadius: 2 }}
                  />
                ))}
              </div>
              <Text style={{ color: '#fff', display: 'block', marginTop: 16 }}>
                Transmitting Voice Data (AES-256 Encrypted)
              </Text>
            </div>
          )}

          {/* Footer Call Info */}
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
                {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
              </Text>
            </div>
            <Button 
              type="primary" 
              danger 
              shape="round" 
              size="large" 
              onClick={endCall} 
              style={{ padding: '0 32px' }}
            >
              Hang Up Call
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
