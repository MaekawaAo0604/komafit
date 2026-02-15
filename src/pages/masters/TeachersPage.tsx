/**
 * Teachers Master Page
 *
 * Page for managing teacher master data.
 * Requirements: REQ-3（講師マスタ管理）
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TeacherForm, TeacherFormData } from '@/components/forms/TeacherForm'
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  addTeacherSkill,
  removeTeacherSkill,
  getTeacherSkills,
} from '@/services/teachers'
import { createTeacherUser } from '@/services/auth'
import { gradeToDisplay } from '@/utils/gradeHelper'
import type { Teacher } from '@/types/entities'

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const TeachersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`

const TeacherCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const TeacherName = styled.h3`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
`

const InfoLabel = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`

const InfoValue = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`

const SkillsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`

const SkillTag = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`

const LoadingText = styled.p`
  text-align: center;
  color: #6b7280;
  padding: 2rem;
`

const ErrorText = styled.p`
  color: #ef4444;
  text-align: center;
  padding: 2rem;
`

const PasswordModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
`

const PasswordWarning = styled.div`
  padding: 1rem;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 0.5rem;
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
`

const CredentialBox = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const CredentialLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const CredentialValue = styled.div`
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  padding: 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
`

const CredentialText = styled.span`
  flex: 1;
  word-break: break-all;
`

const CopyButton = styled(Button)`
  flex-shrink: 0;
`

const PasswordModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`

export const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string
    password: string
    name: string
  } | null>(null)

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listTeachers(true)
      setTeachers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '講師の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTeacher(null)
    setShowModal(true)
  }

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setShowModal(true)
  }

  const handleDelete = async (teacher: Teacher) => {
    if (
      !window.confirm(
        `「${teacher.name}」を削除してもよろしいですか？\n\n※この操作は取り消せません。`
      )
    ) {
      return
    }

    try {
      await deleteTeacher(teacher.id)
      await loadTeachers()
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const handleSubmit = async (data: TeacherFormData) => {
    try {
      if (editingTeacher) {
        // Update existing teacher
        await updateTeacher(editingTeacher.id, {
          name: data.name,
          capWeekSlots: data.capWeekSlots,
          capStudents: data.capStudents,
          allowPair: data.allowPair,
        })

        // Update skills
        const currentSkills = await getTeacherSkills(editingTeacher.id)

        // Remove old skills
        for (const skill of currentSkills) {
          await removeTeacherSkill(editingTeacher.id, skill.subject)
        }

        // Add new skills
        for (const skill of data.skills) {
          if (skill.subject.trim()) {
            await addTeacherSkill(editingTeacher.id, {
              subject: skill.subject,
              gradeMin: skill.gradeMin,
              gradeMax: skill.gradeMax,
            })
          }
        }
      } else {
        // Create user account if requested
        let userId: string | undefined = undefined
        let generatedPassword: string | undefined = undefined
        if (data.createUserAccount && data.email) {
          try {
            const result = await createTeacherUser(data.email, data.name)
            userId = result.userId
            generatedPassword = result.password
          } catch (err) {
            throw new Error(
              `ユーザーアカウントの作成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`
            )
          }
        }

        // Create new teacher
        const newTeacher = await createTeacher({
          userId: userId || null,
          name: data.name,
          capWeekSlots: data.capWeekSlots,
          capStudents: data.capStudents,
          allowPair: data.allowPair,
        })

        // Add skills
        for (const skill of data.skills) {
          if (skill.subject.trim()) {
            await addTeacherSkill(newTeacher.id, {
              subject: skill.subject,
              gradeMin: skill.gradeMin,
              gradeMax: skill.gradeMax,
            })
          }
        }

        // Show password modal if account was created
        if (userId && generatedPassword && data.email) {
          setGeneratedCredentials({
            email: data.email,
            password: generatedPassword,
            name: data.name,
          })
          setShowPasswordModal(true)
        }
      }

      setShowModal(false)
      await loadTeachers()
    } catch (err) {
      throw err
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingTeacher(null)
  }

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('コピーしました')
    } catch (err) {
      alert('コピーに失敗しました')
    }
  }

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false)
    setGeneratedCredentials(null)
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingText>読み込み中...</LoadingText>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorText>{error}</ErrorText>
        <div style={{ textAlign: 'center' }}>
          <Button onClick={loadTeachers}>再読み込み</Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader>
        <Title>講師マスタ</Title>
        <Button onClick={handleCreate}>+ 新規講師</Button>
      </PageHeader>

      {teachers.length === 0 ? (
        <Card padding="lg">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              講師が登録されていません
            </p>
            <Button onClick={handleCreate}>最初の講師を登録</Button>
          </div>
        </Card>
      ) : (
        <TeachersGrid>
          {teachers.map((teacher) => (
            <Card key={teacher.id}>
              <TeacherCardContent>
                <TeacherName>{teacher.name}</TeacherName>

                <div>
                  <InfoRow>
                    <InfoLabel>週上限コマ数</InfoLabel>
                    <InfoValue>{teacher.capWeekSlots}コマ</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>同時担当生徒数</InfoLabel>
                    <InfoValue>{teacher.capStudents}人</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>1:2指導</InfoLabel>
                    <InfoValue>{teacher.allowPair ? '可' : '不可'}</InfoValue>
                  </InfoRow>
                </div>

                {teacher.skills && teacher.skills.length > 0 && (
                  <div>
                    <InfoLabel>対応教科・学年</InfoLabel>
                    <SkillsList>
                      {teacher.skills.map((skill, idx) => (
                        <SkillTag key={idx}>
                          {skill.subject} ({gradeToDisplay(skill.gradeMin)}〜
                          {gradeToDisplay(skill.gradeMax)})
                        </SkillTag>
                      ))}
                    </SkillsList>
                  </div>
                )}

                <ButtonRow>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleEdit(teacher)}
                  >
                    編集
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={() => handleDelete(teacher)}
                  >
                    削除
                  </Button>
                </ButtonRow>
              </TeacherCardContent>
            </Card>
          ))}
        </TeachersGrid>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCancel}
          title={editingTeacher ? '講師を編集' : '新規講師を作成'}
          size="lg"
        >
          <TeacherForm
            teacher={editingTeacher}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </Modal>
      )}

      {showPasswordModal && generatedCredentials && (
        <Modal
          isOpen={showPasswordModal}
          onClose={handleClosePasswordModal}
          title="✅ 講師アカウントを作成しました"
          size="md"
        >
          <PasswordModalContent>
            <PasswordWarning>
              <strong>⚠️ 重要：</strong> このパスワードは今だけ表示されます。
              <br />
              必ずコピーして、講師に安全な方法で共有してください。
              <br />
              このモーダルを閉じると、二度と表示されません。
            </PasswordWarning>

            <CredentialBox>
              <CredentialLabel>講師名</CredentialLabel>
              <CredentialValue>
                <CredentialText>{generatedCredentials.name}</CredentialText>
              </CredentialValue>
            </CredentialBox>

            <CredentialBox>
              <CredentialLabel>メールアドレス（ログインID）</CredentialLabel>
              <CredentialValue>
                <CredentialText>{generatedCredentials.email}</CredentialText>
                <CopyButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyToClipboard(generatedCredentials.email)}
                >
                  コピー
                </CopyButton>
              </CredentialValue>
            </CredentialBox>

            <CredentialBox>
              <CredentialLabel>パスワード（初回ログイン用）</CredentialLabel>
              <CredentialValue>
                <CredentialText>{generatedCredentials.password}</CredentialText>
                <CopyButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleCopyToClipboard(generatedCredentials.password)}
                >
                  コピー
                </CopyButton>
              </CredentialValue>
            </CredentialBox>

            <PasswordModalActions>
              <Button variant="primary" onClick={handleClosePasswordModal}>
                確認しました
              </Button>
            </PasswordModalActions>
          </PasswordModalContent>
        </Modal>
      )}
    </PageContainer>
  )
}
