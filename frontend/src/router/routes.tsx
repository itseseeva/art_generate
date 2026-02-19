import { Routes, Route, Navigate } from 'react-router-dom';
import { LanguageWrapper } from '../components/LanguageWrapper';
import { MainPage } from '../components/MainPage';
import { ChatContainer } from '../components/ChatContainer';
import { MyCharactersPage } from '../components/MyCharactersPage';
import { CreateCharacterPage } from '../components/CreateCharacterPage';
import { ShopPage } from '../components/ShopPage';
import { ProfilePage } from '../components/ProfilePage';
import { MessagesPage } from '../components/MessagesPage';
import { HistoryPage } from '../components/HistoryPage';
import { UserGalleryPage } from '../components/UserGalleryPage';
import { PaidAlbumPage } from '../components/PaidAlbumPage';
import { PaidAlbumBuilderPage } from '../components/PaidAlbumBuilderPage';
import { PhotoGenerationPage3 } from '../components/PhotoGenerationPage3';
import { EditCharactersPage } from '../components/EditCharactersPage';
import { EditCharacterPage } from '../components/EditCharacterPage';
import { FavoritesPage } from '../components/FavoritesPage';
import { CharacterCommentsPage } from '../components/CharacterCommentsPage';
import { BugReportPage } from '../components/BugReportPage';
import { AdminLogsPage } from '../components/AdminLogsPage';
import { LegalPage } from '../components/LegalPage';
import { AboutPage } from '../components/AboutPage';
import { HowItWorksPage } from '../components/HowItWorksPage';
import AuthPage from '../components/AuthPage';
import RegisterPage from '../components/RegisterPage';
import ForgotPasswordPage from '../components/ForgotPasswordPage';
import { TagsPage } from '../components/TagsPage';
import { TermsPage } from '../components/TermsPage';
import { PrivacyPage } from '../components/PrivacyPage';

interface AppRoutesProps {
    // Props that pages need from App.tsx state
    selectedCharacter: any;
    setSelectedCharacter: (char: any) => void;
    contentMode: 'safe' | 'nsfw';
    setContentMode: (mode: 'safe' | 'nsfw') => void;
    selectedSubscriptionType: string;
    setSelectedSubscriptionType: (type: string) => void;
    selectedTagId: string | null;
    setSelectedTagId: (id: string | null) => void;
    tagName: string;
    setTagName: (name: string) => void;
    selectedProfileUsername: string | null;
    setSelectedProfileUsername: (username: string | null) => void;
    onOpenPaidAlbumBuilder?: (character: any) => void;
    onOpenChat?: (character: any) => void;
    // Add other necessary props
}

// Helper component for root redirect
const RootRedirect = () => {
    const userLang = navigator.language.split('-')[0];
    const targetLang = ['ru', 'en'].includes(userLang) ? userLang : 'ru';
    return <Navigate to={`/${targetLang}/`} replace />;
};

export const AppRoutes = (props: AppRoutesProps) => {
    return (
        <Routes>
            {/* Smart Redirect from root */}
            <Route path="/" element={<RootRedirect />} />

            {/* Language-prefixed routes */}
            <Route path="/:lang" element={<LanguageWrapper />}>
                <Route index element={<MainPage {...props} />} />
                <Route path="chat" element={<ChatContainer initialCharacter={props.selectedCharacter} {...props} />} />
                <Route path="my-characters" element={<MyCharactersPage {...props} />} />
                <Route path="create-character" element={<CreateCharacterPage {...props} />} />
                <Route path="shop" element={<ShopPage {...props} />} />
                <Route path="profile" element={<ProfilePage {...props} />} />
                <Route path="profile/:username" element={<ProfilePage {...props} />} />
                <Route path="messages" element={<MessagesPage {...props} />} />
                <Route path="history" element={<HistoryPage {...props} />} />
                <Route path="user-gallery" element={<UserGalleryPage {...props} />} />
                <Route path="paid-album" element={<PaidAlbumPage {...props} />} />
                <Route path="paid-album-builder" element={<PaidAlbumBuilderPage {...props} />} />
                <Route path="photo-generation" element={<PhotoGenerationPage3 {...props} />} />
                <Route path="edit-characters" element={<EditCharactersPage {...props} />} />
                <Route path="favorites" element={<FavoritesPage {...props} />} />
                <Route path="character-comments" element={<CharacterCommentsPage {...props} />} />
                <Route path="bug-report" element={<BugReportPage />} />
                <Route path="admin-logs" element={<AdminLogsPage {...props} />} />
                <Route path="legal" element={<LegalPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="privacy" element={<PrivacyPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="how-it-works" element={<HowItWorksPage />} />
                <Route path="login" element={<AuthPage {...props} />} />
                <Route path="register" element={<RegisterPage {...props} />} />
                <Route path="forgot-password" element={<ForgotPasswordPage {...props} />} />
                <Route path="tags/:tagSlug" element={<TagsPage {...props} />} />

                {/* Routes needing specific props or params handling */}
                <Route path="edit-character" element={<EditCharacterPage {...props} />} />
            </Route>
        </Routes>
    );
};
