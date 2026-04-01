import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { authManager } from '../../utils/auth';
import { FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiCheck } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../../config/api';
import axios from 'axios';

const AdminContainer = styled.div`
  width: 100%;
  padding: ${theme.spacing.xl};
  max-width: 1200px;
  margin: 0 auto;
  color: #fff;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.1); }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #a855f7 0%, #f97316 100%);
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s;
  &:hover { transform: scale(1.02); }
`;

const SlideCard = styled.div`
  background: rgba(30, 30, 30, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1.5rem;
  @media (max-width: 768px) { flex-direction: column; }
`;

const SlideImage = styled.img`
  width: 200px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SlideInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
`;

const IconButton = styled.button<{ color?: string }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${props => props.color || '#fff'};
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.1); }
`;

const Form = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
`;

const Input = styled.input`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  color: #fff;
  width: 100%;
  &:focus { border-color: #a855f7; outline: none; }
`;

const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.9rem;
`;

interface Slide {
  id: number;
  image_url: string;
  image_url_en: string;
  target_url: string;
  is_active: boolean;
  order: number;
  show_timer: boolean;
}

export const AdminSliderPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editForm, setEditForm] = useState<Partial<Slide>>({});
  const [selectedFileRu, setSelectedFileRu] = useState<File | null>(null);
  const [selectedFileEn, setSelectedFileEn] = useState<File | null>(null);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const response = await authManager.fetchWithAuth('/api/v1/promo-slider/');
      if (response.ok) {
        const data = await response.json();
        setSlides(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch slides, status:', response.status);
        setSlides([]);
      }
    } catch (err) {
      console.error(err);
      setSlides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleEdit = (slide: Slide) => {
    setEditingId(slide.id);
    setEditForm(slide);
    setSelectedFileRu(null);
    setSelectedFileEn(null);
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({
      target_url: 'https://',
      is_active: true,
      order: 0,
      show_timer: false
    });
    setSelectedFileRu(null);
    setSelectedFileEn(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(currentLang === 'ru' ? 'Удалить этот слайд?' : 'Delete this slide?')) return;
    try {
      const response = await authManager.fetchWithAuth(`/api/v1/promo-slider/${id}`, { method: 'DELETE' });
      if (response.ok) fetchSlides();
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    const formData = new FormData();
    Object.entries(editForm).forEach(([key, value]) => {
      if (!['image_url', 'image_url_en', 'id', 'created_at'].includes(key) && value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    if (selectedFileRu) {
      formData.append('file_ru', selectedFileRu);
    }
    if (selectedFileEn) {
      formData.append('file_en', selectedFileEn);
    }

    try {
      const url = editingId === 'new' ? '/api/v1/promo-slider/' : `/api/v1/promo-slider/${editingId}`;
      const method = editingId === 'new' ? 'POST' : 'PUT';

      // Custom fetch with Form Data and Auth
      const token = authManager.getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        setEditingId(null);
        fetchSlides();
      } else {
        const err = await response.json();
        alert(err.detail || 'Error saving slide');
      }
    } catch (err) { console.error(err); }
  };

  if (loading && !editingId) return <LoadingSpinner size="lg" />;

  return (
    <AdminContainer>
      <Header>
        <BackButton onClick={onBack}><FiArrowLeft /> {currentLang === 'en' ? 'Back' : 'Назад'}</BackButton>
        <h1 style={{ margin: 0 }}>Promo Slider CMS</h1>
        <AddButton onClick={handleAddNew}><FiPlus /> {currentLang === 'en' ? 'Add Slide' : 'Добавить слайд'}</AddButton>
      </Header>

      {editingId && (
        <SlideCard style={{ border: '2px solid #a855f7' }}>
          <Form>
            <FormGroup style={{ gridColumn: '1 / -1' }}>
              <Label>Target URL (Telegram, Website, etc.)</Label>
              <Input 
                value={editForm.target_url || ''} 
                onChange={e => setEditForm({...editForm, target_url: e.target.value})} 
                placeholder="https://t.me/your_channel"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>RU Image (Показывается при RU версии)</Label>
              <Input type="file" onChange={e => setSelectedFileRu(e.target.files?.[0] || null)} />
              {editForm.image_url && <span style={{fontSize: '0.7rem', opacity: 0.5}}>Текущий файл RU: {editForm.image_url.split('/').pop()}</span>}
            </FormGroup>

            <FormGroup>
              <Label>EN Image (Show for EN version)</Label>
              <Input type="file" onChange={e => setSelectedFileEn(e.target.files?.[0] || null)} />
              {editForm.image_url_en && <span style={{fontSize: '0.7rem', opacity: 0.5}}>Current EN file: {editForm.image_url_en.split('/').pop()}</span>}
            </FormGroup>

            <FormGroup>
              <Label>Order</Label>
              <Input type="number" value={editForm.order || 0} onChange={e => setEditForm({...editForm, order: parseInt(e.target.value)})} />
            </FormGroup>
            
            <FormGroup style={{ justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
              <SwitchLabel>
                <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
                Active
              </SwitchLabel>
              <SwitchLabel style={{ color: '#a855f7' }}>
                <input type="checkbox" checked={editForm.show_timer} onChange={e => setEditForm({...editForm, show_timer: e.target.checked})} />
                Show Timer
              </SwitchLabel>
            </FormGroup>
          </Form>
          <ActionButtons>
            <IconButton color="#22c55e" onClick={handleSave}><FiCheck /></IconButton>
            <IconButton color="#ef4444" onClick={() => setEditingId(null)}><FiX /></IconButton>
          </ActionButtons>
        </SlideCard>
      )}

      {Array.isArray(slides) && slides.map(slide => (
        <SlideCard key={slide.id}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <SlideImage src={slide.image_url} alt="RU" title="RU Version" />
            <SlideImage src={slide.image_url_en || slide.image_url} alt="EN" title="EN Version" style={{ opacity: slide.image_url_en ? 1 : 0.5 }} />
          </div>
          <SlideInfo>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Slide #{slide.id}</h3>
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Order: {slide.order}</span>
              {!slide.is_active && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>INACTIVE</span>}
              {slide.show_timer && <span style={{ color: '#a855f7', fontSize: '0.7rem' }}>TIMER ENABLED</span>}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, wordBreak: 'break-all' }}>URL: {slide.target_url}</div>
          </SlideInfo>
          <ActionButtons>
            <IconButton onClick={() => handleEdit(slide)}><FiEdit2 /></IconButton>
            <IconButton color="#ef4444" onClick={() => handleDelete(slide.id)}><FiTrash2 /></IconButton>
          </ActionButtons>
        </SlideCard>
      ))}

      {slides.length === 0 && !editingId && (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          No slides found. Click "Add Slide" to create the first one.
        </div>
      )}
    </AdminContainer>
  );
};
