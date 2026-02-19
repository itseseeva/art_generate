import React from 'react';
import { useTranslation } from 'react-i18next';
import { Footer } from './Footer';
import DarkVeil from '../../@/components/DarkVeil';
import {
    MainContainer,
    BackgroundWrapper,
    Container,
    Content,
    Title,
    LastUpdated,
    Text,
    RecursiveContent
} from './LegalStyles';

interface LegalDocumentProps {
    rootKey: string;
}

export const LegalDocument: React.FC<LegalDocumentProps> = ({ rootKey }) => {
    const { t } = useTranslation();
    const data = t(rootKey, { returnObjects: true }) as any;

    if (!data || typeof data !== 'object') {
        console.error(`LegalDocument: Failed to load data for rootKey "${rootKey}"`, data);
        return null;
    }

    return (
        <MainContainer>
            <BackgroundWrapper>
                <DarkVeil speed={1.1} />
            </BackgroundWrapper>
            <Container>
                <Content>
                    <Title>{data.title}</Title>
                    {data.lastUpdated && <LastUpdated>{data.lastUpdated}</LastUpdated>}
                    {data.intro && <Text dangerouslySetInnerHTML={{ __html: data.intro }} />}

                    <RecursiveContent data={data} />

                </Content>
            </Container>
            <Footer />
        </MainContainer>
    );
};
