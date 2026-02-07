'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Shield, Handshake, DollarSign, ArrowLeftRight,
  MapPin, Ban, Zap, X, Plus, Check, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface OrderPreferences {
  id?: string
  allow_swaps: boolean
  allow_money: boolean
  allow_mixed: boolean
  min_trust_points: number
  auto_accept: boolean
  default_orders_private: boolean
  accepted_hubs: string[]
  blacklisted_items: string[]
  notes: string | null
}

const DEFAULTS: OrderPreferences = {
  allow_swaps: true,
  allow_money: true,
  allow_mixed: true,
  min_trust_points: 0,
  auto_accept: false,
  default_orders_private: true,
  accepted_hubs: [],
  blacklisted_items: [],
  notes: null,
}

export default function PreferencesPage() {
  const { data: prefs, isLoading, mutate: refreshPrefs } = useSWR<OrderPreferences | null>(
    '/api/orders/preferences', fetcher
  )
  const [form, setForm] = useState<OrderPreferences>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newHub, setNewHub] = useState('')
  const [newBlacklist, setNewBlacklist] = useState('')

  useEffect(() => {
    if (prefs) setForm(prefs)
  }, [prefs])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/orders/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await refreshPrefs()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addHub = () => {
    if (newHub.trim() && !form.accepted_hubs.includes(newHub.trim())) {
      setForm({ ...form, accepted_hubs: [...form.accepted_hubs, newHub.trim()] })
      setNewHub('')
    }
  }

  const removeHub = (hub: string) => {
    setForm({ ...form, accepted_hubs: form.accepted_hubs.filter(h => h !== hub) })
  }

  const addBlacklist = () => {
    if (newBlacklist.trim() && !form.blacklisted_items.includes(newBlacklist.trim())) {
      setForm({ ...form, blacklisted_items: [...form.blacklisted_items, newBlacklist.trim()] })
      setNewBlacklist('')
    }
  }

  const removeBlacklist = (item: string) => {
    setForm({ ...form, blacklisted_items: form.blacklisted_items.filter(i => i !== item) })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/orders" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">Order Preferences</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Transaction Types */}
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Handshake className="h-4 w-4 text-primary" />
              Transaction Types
            </h2>
            <p className="text-xs text-muted-foreground">What kinds of exchanges are you open to?</p>

            <div className="space-y-2">
              <ToggleRow
                active={form.allow_swaps}
                onChange={v => setForm({ ...form, allow_swaps: v })}
                icon={<ArrowLeftRight className="h-4 w-4" />}
                label="Swaps"
                desc="Trade goods for goods, no money involved"
              />
              <ToggleRow
                active={form.allow_money}
                onChange={v => setForm({ ...form, allow_money: v })}
                icon={<DollarSign className="h-4 w-4" />}
                label="Money"
                desc="Buy or sell with cash payments"
              />
              <ToggleRow
                active={form.allow_mixed}
                onChange={v => setForm({ ...form, allow_mixed: v })}
                icon={<Handshake className="h-4 w-4" />}
                label="Mixed"
                desc="Combo of swaps and money"
              />
            </div>
          </CardContent>
        </Card>

        {/* Trust + Auto-accept */}
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Trust & Auto-accept
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Minimum trust points to trade with you</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={form.min_trust_points}
                  onChange={e => setForm({ ...form, min_trust_points: Number(e.target.value) || 0 })}
                  className="w-24 text-sm"
                  min={0}
                />
                <span className="text-xs text-muted-foreground">points (0 = open to everyone)</span>
              </div>
            </div>

  <ToggleRow
  active={form.auto_accept}
  onChange={v => setForm({ ...form, auto_accept: v })}
  icon={<Zap className="h-4 w-4" />}
  label="Auto-accept"
  desc="Instantly accept orders from trusted members (above threshold)"
  />
  
  <ToggleRow
  active={form.default_orders_private}
  onChange={v => setForm({ ...form, default_orders_private: v })}
  icon={<Shield className="h-4 w-4" />}
  label="Orders private by default"
  desc="New orders are only visible to you and the other party"
  />
  </CardContent>
        </Card>

        {/* Accepted Hubs */}
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Accepted Hubs
            </h2>
            <p className="text-xs text-muted-foreground">
              Hubs where you can pick up or drop off. Leave empty to accept all hubs.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {form.accepted_hubs.map(hub => (
                <span key={hub} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {hub}
                  <button onClick={() => removeHub(hub)} className="hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add hub name..."
                value={newHub}
                onChange={e => setNewHub(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHub())}
                className="text-sm flex-1"
              />
              <Button size="sm" variant="outline" onClick={addHub} disabled={!newHub.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Blacklisted Items */}
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Excluded Items
            </h2>
            <p className="text-xs text-muted-foreground">
              Products you never want to receive (allergies, dietary, etc.)
            </p>

            <div className="flex flex-wrap gap-1.5">
              {form.blacklisted_items.map(item => (
                <span key={item} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                  {item}
                  <button onClick={() => removeBlacklist(item)} className="hover:text-destructive/70 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add item to exclude..."
                value={newBlacklist}
                onChange={e => setNewBlacklist(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBlacklist())}
                className="text-sm flex-1"
              />
              <Button size="sm" variant="outline" onClick={addBlacklist} disabled={!newBlacklist.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="py-4 px-4 space-y-2">
            <h2 className="text-sm font-semibold">Notes</h2>
            <Textarea
              placeholder="Anything else other members should know about trading with you..."
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value || null })}
              rows={3}
              className="text-sm resize-none"
            />
          </CardContent>
        </Card>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
          ) : saved ? (
            <><Check className="h-4 w-4 mr-2" />Saved</>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  )
}

/* ── Toggle Row ──────────────────────────────────────── */
function ToggleRow({ active, onChange, icon, label, desc }: {
  active: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string; desc: string
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors border',
        active ? 'border-primary/30 bg-primary/5' : 'border-transparent bg-muted/30 opacity-60'
      )}
    >
      <div className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <div className={cn(
        'h-5 w-9 rounded-full p-0.5 transition-colors shrink-0',
        active ? 'bg-primary' : 'bg-muted-foreground/30'
      )}>
        <div className={cn(
          'h-4 w-4 rounded-full bg-background transition-transform',
          active ? 'translate-x-4' : 'translate-x-0'
        )} />
      </div>
    </button>
  )
}
