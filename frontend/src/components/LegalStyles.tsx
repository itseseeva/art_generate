import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

export const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  padding: 0;
  overflow-y: visible;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: white;
`;

export const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

export const Container = styled.div`
  padding: 4rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
  color: ${theme.colors.text.primary};
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

export const Content = styled.div`
  flex: 1;
  position: relative;
  z-index: 1;
`;

export const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 3rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: center;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 3px;
    background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
    border-radius: 2px;
  }
`;

export const Section = styled.section`
  margin-bottom: 3.5rem;
  padding: 2.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #8b5cf6, #6366f1);
    opacity: 0.6;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateX(5px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 
                inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
`;

export const SectionTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
  position: relative;
  padding-left: 1rem;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 24px;
    background: linear-gradient(180deg, #8b5cf6, #6366f1);
    border-radius: 2px;
  }
`;

export const Text = styled.p`
  font-size: 1.05rem;
  line-height: 1.8;
  margin-bottom: 1.25rem;
  color: #d1d1d1;
  
  strong {
    color: #ffffff;
    font-weight: 600;
    background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  a {
    color: #8b5cf6;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: all 0.2s;
    
    &:hover {
        color: #a78bfa;
        border-bottom-color: #a78bfa;
    }
  }

  br {
    line-height: 2;
  }
`;

export const List = styled.ul`
  margin-left: 1.5rem;
  margin-bottom: 1.25rem;
  color: #d1d1d1;
`;

export const ListItem = styled.li`
  margin-bottom: 0.75rem;
  line-height: 1.6;
  list-style-type: disc;
  
  strong {
    color: #ffffff;
     font-weight: 600;
  }
`;

export const Subsection = styled.div`
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 2px solid rgba(139, 92, 246, 0.3);
`;

export const SubsectionTitle = styled.h3`
  font-size: 1.3rem;
  margin-bottom: 0.75rem;
  color: #e5e5e5;
  font-weight: 600;
`;

export const Table = styled.table`
    width: 100%;
    margin-bottom: 1.5rem;
    border-collapse: collapse;
    color: #d1d1d1;
    font-size: 1rem;
    
    td {
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        vertical-align: top;
    }
    
    tr:nth-child(even) {
        background: rgba(255, 255, 255, 0.02);
    }
`;

export const LastUpdated = styled.div`
    text-align: center;
    color: #888;
    margin-bottom: 2rem;
    font-size: 0.9rem;
`;

export const Agreement = styled.div`
    background: rgba(139, 92, 246, 0.1);
    padding: 1.5rem;
    border-left: 4px solid #8b5cf6;
    margin-top: 2rem;
    border-radius: 4px;
    font-weight: 500;
    color: #fff;
`;

export const RecursiveContent = ({ data, isTopLevel = false }: { data: any, isTopLevel?: boolean }) => {
  if (!data || typeof data !== 'object') return null;

  return (
    <>
      {isTopLevel && data.title && <SectionTitle>{data.title}</SectionTitle>}
      {isTopLevel && data.lastUpdated && <LastUpdated>{data.lastUpdated}</LastUpdated>}

      {data.intro && <Text dangerouslySetInnerHTML={{ __html: data.intro }} />}
      {data.text && <Text dangerouslySetInnerHTML={{ __html: data.text }} />}

      {data.list && (
        <List>
          {Object.values(data.list).map((item: any, i) => (
            <ListItem key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </List>
      )}

      {data.table && (
        <Table>
          <tbody>
            {data.table.map((row: any, i: number) => (
              <tr key={i}>
                <td width="30%"><strong>{row.col1}</strong></td>
                <td>{row.col2}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {data.subsections && Object.keys(data.subsections).map((key) => {
        const sub = data.subsections[key];
        return (
          <Subsection key={key}>
            <SubsectionTitle>{sub.title}</SubsectionTitle>
            <RecursiveContent data={sub} />
          </Subsection>
        );
      })}

      {data.items && Object.keys(data.items).map((key) => {
        const item = data.items[key];
        return (
          <Section key={key}>
            <SectionTitle>{item.title}</SectionTitle>
            <RecursiveContent data={item} />
          </Section>
        );
      })}

      {data.note && (
        <Text style={{ fontStyle: 'italic', opacity: 0.8 }}>
          <strong>Note:</strong> {data.note}
        </Text>
      )}

      {data.agreement && <Agreement dangerouslySetInnerHTML={{ __html: data.agreement }} />}
    </>
  );
};
