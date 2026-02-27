/**
 * Tutorial Modal Component
 *
 * Step-by-step tutorial for admin and teacher users.
 * Shows role-specific steps to guide users through the app.
 */

import React, { useState } from 'react'
import styled from 'styled-components'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { UserRole } from '@/types/entities'

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
  role: UserRole | null
}

interface TutorialStep {
  title: string
  description: string
  icon: string
}

const ADMIN_STEPS: TutorialStep[] = [
  {
    title: 'ようこそ KomaFit へ',
    icon: '🎉',
    description:
      'KomaFitは塾の授業スケジュールを管理するシステムです。講師と生徒のマスタ管理、月次カレンダーでの授業割当、定期パターン設定などを行えます。',
  },
  {
    title: '講師マスタ',
    icon: '👨‍🏫',
    description:
      'サイドバーの「講師マスタ」から講師を登録・編集できます。対応教科・学年、週あたりの上限コマ数、1:2指導の可否などを設定します。ユーザーアカウントを作成すると、講師自身もログインできます。',
  },
  {
    title: '生徒マスタ',
    icon: '👩‍🎓',
    description:
      '「生徒マスタ」から生徒を登録・編集できます。学年、受講科目、1対1必須フラグ、NG講師の設定が可能です。',
  },
  {
    title: '月次カレンダー',
    icon: '📅',
    description:
      '月次カレンダーでは、講師ごとの空き枠確認と生徒のアサインを行います。セルをクリックして生徒を割当てたり、アサイン済みの授業を解除できます。色分けでパターン由来（青）と個別アサイン（緑）を区別できます。',
  },
  {
    title: '割当ボード',
    icon: '📋',
    description:
      '割当ボードは週テンプレートの管理画面です。各コマに講師を配置し、その講師の枠に生徒を割当てます。ここでの設定は毎週のベースとなります。',
  },
  {
    title: '定期授業パターン',
    icon: '🔄',
    description:
      '月次カレンダーの「パターン管理」から、毎週繰り返す定期授業を登録できます。曜日・コマ・講師・生徒・科目を指定すると、カレンダーに自動展開されます。個別の日だけ例外設定も可能です。',
  },
  {
    title: 'コマ数レポート',
    icon: '📊',
    description:
      '「コマ数レポート」で講師別の月間コマ数を確認できます。1:1と1:2の内訳も表示されます。',
  },
]

const TEACHER_STEPS: TutorialStep[] = [
  {
    title: 'ようこそ KomaFit へ',
    icon: '🎉',
    description:
      'KomaFitは塾の授業スケジュールを確認・管理するシステムです。自分のスケジュールの確認や、コマ数のチェックができます。',
  },
  {
    title: '月次カレンダー',
    icon: '📅',
    description:
      '月次カレンダーで自分の授業スケジュールを確認できます。色分けで定期授業（青）と個別アサイン（緑）が区別されています。空き枠の設定もここから行えます。',
  },
  {
    title: '割当ボード',
    icon: '📋',
    description:
      '割当ボードで週ごとの授業一覧を確認できます。各コマに割り当てられた生徒と科目が表示されます。',
  },
  {
    title: 'コマ数レポート',
    icon: '📊',
    description:
      '「コマ数レポート」で自分の月間コマ数を確認できます。1:1と1:2の内訳も表示されます。',
  },
]

const TUTORIAL_STORAGE_KEY = 'tutorial_completed_v1'

export function markTutorialComplete() {
  localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
}

export function isTutorialCompleted(): boolean {
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true'
}

const StepContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem;
  gap: 1rem;
`

const StepIcon = styled.div`
  font-size: 3rem;
  line-height: 1;
`

const StepTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const StepDescription = styled.p`
  font-size: 0.9375rem;
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
  max-width: 480px;
`

const StepIndicator = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.5rem;
`

const Dot = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? '#3b82f6' : '#d1d5db')};
  transition: background 0.2s;
`

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
`

const StepCounter = styled.span`
  font-size: 0.75rem;
  color: #9ca3af;
`

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  role,
}) => {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = role === 'admin' ? ADMIN_STEPS : TEACHER_STEPS
  const step = steps[currentStep]

  const handleClose = () => {
    markTutorialComplete()
    setCurrentStep(0)
    onClose()
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!step) return null

  const isLast = currentStep === steps.length - 1

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="使い方ガイド" size="md">
      <StepContent>
        <StepIcon>{step.icon}</StepIcon>
        <StepTitle>{step.title}</StepTitle>
        <StepDescription>{step.description}</StepDescription>
        <StepIndicator>
          {steps.map((_, i) => (
            <Dot key={i} $active={i === currentStep} />
          ))}
        </StepIndicator>
        <StepCounter>
          {currentStep + 1} / {steps.length}
        </StepCounter>
      </StepContent>
      <ButtonRow>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          スキップ
        </Button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentStep > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrev}>
              戻る
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handleNext}>
            {isLast ? '完了' : '次へ'}
          </Button>
        </div>
      </ButtonRow>
    </Modal>
  )
}
