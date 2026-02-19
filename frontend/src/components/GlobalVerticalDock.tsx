import React from 'react';
import Dock from './Dock';
import './Dock.css';
import './GlobalVerticalDock.css';
import {
  FiShoppingBag as ShopIcon,
  FiUserPlus as CreateCharacterIcon,
  FiEdit as EditCharactersIcon,
  FiHeart as FavoritesIcon,
  FiClock as HistoryIcon
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface GlobalVerticalDockProps {
  onShop?: () => void;
  onCreateCharacter?: () => void;
  onEditCharacters?: () => void;
  onFavorites?: () => void;
  onHistory?: () => void;
  onMyCharacters?: () => void;
  onMessages?: () => void;
}

export const GlobalVerticalDock: React.FC<GlobalVerticalDockProps> = ({
  onShop,
  onCreateCharacter,
  onEditCharacters,
  onFavorites,
  onHistory,
  onMyCharacters,
  onMessages
}) => {
  const { t } = useTranslation();
  return (
    <div className="vertical-dock-panel global-vertical-dock">
      <Dock
        items={[
          {
            icon: <ShopIcon size={24} />,
            label: t('nav.shop'),
            onClick: () => onShop?.()
          },
          {
            icon: <CreateCharacterIcon size={24} />,
            label: t('nav.createCharacter'),
            onClick: () => onCreateCharacter?.()
          },
          {
            icon: <EditCharactersIcon size={24} />,
            label: t('nav.edit'),
            onClick: () => onEditCharacters?.() || onMyCharacters?.()
          },
          {
            icon: <FavoritesIcon size={24} />,
            label: t('nav.favorites'),
            onClick: () => onFavorites?.() || (() => alert('Избранное будет реализовано в следующих версиях'))
          },
          {
            icon: <HistoryIcon size={24} />,
            label: t('nav.history'),
            onClick: () => onHistory?.() || onMessages?.()
          }
        ]}
        className="vertical-dock"
        spring={{ mass: 0.5, stiffness: 100, damping: 20 }}
        magnification={60}
        distance={160}
        baseItemSize={50}
      />
    </div>
  );
};

