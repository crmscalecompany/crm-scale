export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          entidade_ref: string | null
          erro: string | null
          executado_em: string
          id: string
          payload: Json | null
          rule_id: string | null
          status: string
        }
        Insert: {
          entidade_ref?: string | null
          erro?: string | null
          executado_em?: string
          id?: string
          payload?: Json | null
          rule_id?: string | null
          status: string
        }
        Update: {
          entidade_ref?: string | null
          erro?: string | null
          executado_em?: string
          id?: string
          payload?: Json | null
          rule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          acoes: Json
          ativo: boolean
          condicao: Json | null
          criado_em: string
          evento_gatilho: string
          id: string
          nome: string | null
        }
        Insert: {
          acoes?: Json
          ativo?: boolean
          condicao?: Json | null
          criado_em?: string
          evento_gatilho: string
          id?: string
          nome?: string | null
        }
        Update: {
          acoes?: Json
          ativo?: boolean
          condicao?: Json | null
          criado_em?: string
          evento_gatilho?: string
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      client_accounts: {
        Row: {
          advogado_id: string | null
          am_id: string | null
          deal_id: string
          id: string
          status: string | null
        }
        Insert: {
          advogado_id?: string | null
          am_id?: string | null
          deal_id: string
          id?: string
          status?: string | null
        }
        Update: {
          advogado_id?: string | null
          am_id?: string | null
          deal_id?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_accounts_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_accounts_am_id_fkey"
            columns: ["am_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_accounts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          id: string
          papel: Database["public"]["Enums"]["user_role"] | null
          percentual: number
          vendedor_id: string | null
          vigente_desde: string
        }
        Insert: {
          id?: string
          papel?: Database["public"]["Enums"]["user_role"] | null
          percentual: number
          vendedor_id?: string | null
          vigente_desde: string
        }
        Update: {
          id?: string
          papel?: Database["public"]["Enums"]["user_role"] | null
          percentual?: number
          vendedor_id?: string | null
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          calculado_em: string
          deal_product_id: string
          id: string
          regra_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          valor_calculado: number | null
        }
        Insert: {
          calculado_em?: string
          deal_product_id: string
          id?: string
          regra_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          valor_calculado?: number | null
        }
        Update: {
          calculado_em?: string
          deal_product_id?: string
          id?: string
          regra_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          valor_calculado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_deal_product_id_fkey"
            columns: ["deal_product_id"]
            isOneToOne: false
            referencedRelation: "deal_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          dados_preenchidos: Json | null
          deal_id: string
          doc_url: string | null
          id: string
          provider: string | null
          status_assinatura: Database["public"]["Enums"]["contract_status_assinatura"]
          template_id: string | null
        }
        Insert: {
          dados_preenchidos?: Json | null
          deal_id: string
          doc_url?: string | null
          id?: string
          provider?: string | null
          status_assinatura?: Database["public"]["Enums"]["contract_status_assinatura"]
          template_id?: string | null
        }
        Update: {
          dados_preenchidos?: Json | null
          deal_id?: string
          doc_url?: string | null
          id?: string
          provider?: string | null
          status_assinatura?: Database["public"]["Enums"]["contract_status_assinatura"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_products: {
        Row: {
          deal_id: string
          id: string
          produto: string
          valor_bruto: number | null
          valor_liquido: number | null
          vendedor_id: string | null
        }
        Insert: {
          deal_id: string
          id?: string
          produto: string
          valor_bruto?: number | null
          valor_liquido?: number | null
          vendedor_id?: string | null
        }
        Update: {
          deal_id?: string
          id?: string
          produto?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_products_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          closer_id: string | null
          criado_em: string
          data_agendamento: string | null
          data_fechamento: string | null
          id: string
          janela_fechamento: string | null
          lead_id: string
          modelo: string | null
          motivo_perda: string | null
          raw_monday: Json | null
          status: Database["public"]["Enums"]["deal_status"]
          valor_bruto: number | null
          valor_liquido: number | null
        }
        Insert: {
          closer_id?: string | null
          criado_em?: string
          data_agendamento?: string | null
          data_fechamento?: string | null
          id?: string
          janela_fechamento?: string | null
          lead_id: string
          modelo?: string | null
          motivo_perda?: string | null
          raw_monday?: Json | null
          status?: Database["public"]["Enums"]["deal_status"]
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Update: {
          closer_id?: string | null
          criado_em?: string
          data_agendamento?: string | null
          data_fechamento?: string | null
          id?: string
          janela_fechamento?: string | null
          lead_id?: string
          modelo?: string | null
          motivo_perda?: string | null
          raw_monday?: Json | null
          status?: Database["public"]["Enums"]["deal_status"]
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_motivo_perda_fkey"
            columns: ["motivo_perda"]
            isOneToOne: false
            referencedRelation: "lost_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_attempts: {
        Row: {
          data_prevista: string | null
          deal_id: string | null
          feito_em: string | null
          id: string
          lead_id: string | null
          resultado: string | null
          tentativa_num: number
        }
        Insert: {
          data_prevista?: string | null
          deal_id?: string | null
          feito_em?: string | null
          id?: string
          lead_id?: string | null
          resultado?: string | null
          tentativa_num: number
        }
        Update: {
          data_prevista?: string | null
          deal_id?: string | null
          feito_em?: string | null
          id?: string
          lead_id?: string | null
          resultado?: string | null
          tentativa_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_attempts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attribution: {
        Row: {
          campanha: string | null
          capturado_em: string
          criativo: string | null
          fbclid: string | null
          id: string
          lead_id: string
          lead_id_ads: string | null
          publico: string | null
        }
        Insert: {
          campanha?: string | null
          capturado_em?: string
          criativo?: string | null
          fbclid?: string | null
          id?: string
          lead_id: string
          lead_id_ads?: string | null
          publico?: string | null
        }
        Update: {
          campanha?: string | null
          capturado_em?: string
          criativo?: string | null
          fbclid?: string | null
          id?: string
          lead_id?: string
          lead_id_ads?: string | null
          publico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attribution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cargo: string | null
          criado_em: string | null
          direcao: string | null
          email: string | null
          empresa: string | null
          faturamento_medio: number | null
          faturamento_medio_label: string | null
          id: string
          inserted_at: string
          insta: string | null
          monday_item_id: number | null
          motivo_perda_id: string | null
          niche_id: string | null
          nome: string
          observacao: string | null
          origem: string | null
          owner_sdr_id: string | null
          qualificador: string | null
          raw_monday: Json | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          tipo: string | null
          whatsapp_txt: string | null
        }
        Insert: {
          cargo?: string | null
          criado_em?: string | null
          direcao?: string | null
          email?: string | null
          empresa?: string | null
          faturamento_medio?: number | null
          faturamento_medio_label?: string | null
          id?: string
          inserted_at?: string
          insta?: string | null
          monday_item_id?: number | null
          motivo_perda_id?: string | null
          niche_id?: string | null
          nome: string
          observacao?: string | null
          origem?: string | null
          owner_sdr_id?: string | null
          qualificador?: string | null
          raw_monday?: Json | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo?: string | null
          whatsapp_txt?: string | null
        }
        Update: {
          cargo?: string | null
          criado_em?: string | null
          direcao?: string | null
          email?: string | null
          empresa?: string | null
          faturamento_medio?: number | null
          faturamento_medio_label?: string | null
          id?: string
          inserted_at?: string
          insta?: string | null
          monday_item_id?: number | null
          motivo_perda_id?: string | null
          niche_id?: string | null
          nome?: string
          observacao?: string | null
          origem?: string | null
          owner_sdr_id?: string | null
          qualificador?: string | null
          raw_monday?: Json | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo?: string | null
          whatsapp_txt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "lost_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_sdr_id_fkey"
            columns: ["owner_sdr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_reasons: {
        Row: {
          ativo: boolean
          categoria: string
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          cadencia: string | null
          google_event_id: string | null
          id: string
          notas_internas: string | null
          recorrente: boolean
          referencia_id: string
          referencia_tipo: Database["public"]["Enums"]["meeting_referencia_tipo"]
          responsavel_id: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          tipo: Database["public"]["Enums"]["meeting_tipo"]
        }
        Insert: {
          cadencia?: string | null
          google_event_id?: string | null
          id?: string
          notas_internas?: string | null
          recorrente?: boolean
          referencia_id: string
          referencia_tipo: Database["public"]["Enums"]["meeting_referencia_tipo"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          tipo: Database["public"]["Enums"]["meeting_tipo"]
        }
        Update: {
          cadencia?: string | null
          google_event_id?: string | null
          id?: string
          notas_internas?: string | null
          recorrente?: boolean
          referencia_id?: string
          referencia_tipo?: Database["public"]["Enums"]["meeting_referencia_tipo"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          tipo?: Database["public"]["Enums"]["meeting_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "meetings_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_conversion_events: {
        Row: {
          deal_id: string | null
          enviado_em: string | null
          event_name: Database["public"]["Enums"]["meta_event_name"]
          event_time: string | null
          fbclid: string | null
          id: string
          lead_id: string | null
          resposta_meta: Json | null
          status: Database["public"]["Enums"]["meta_event_status"]
          valor: number | null
        }
        Insert: {
          deal_id?: string | null
          enviado_em?: string | null
          event_name: Database["public"]["Enums"]["meta_event_name"]
          event_time?: string | null
          fbclid?: string | null
          id?: string
          lead_id?: string | null
          resposta_meta?: Json | null
          status?: Database["public"]["Enums"]["meta_event_status"]
          valor?: number | null
        }
        Update: {
          deal_id?: string | null
          enviado_em?: string | null
          event_name?: Database["public"]["Enums"]["meta_event_name"]
          event_time?: string | null
          fbclid?: string | null
          id?: string
          lead_id?: string | null
          resposta_meta?: Json | null
          status?: Database["public"]["Enums"]["meta_event_status"]
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_conversion_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversion_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      niches: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      qualification_reasons: {
        Row: {
          ativo: boolean
          codigo: string
          descricao: string
          etapa: Database["public"]["Enums"]["qualification_etapa"]
          id: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          descricao: string
          etapa: Database["public"]["Enums"]["qualification_etapa"]
          id?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          descricao?: string
          etapa?: Database["public"]["Enums"]["qualification_etapa"]
          id?: string
        }
        Relationships: []
      }
      qualifications: {
        Row: {
          comentario: string | null
          criado_em: string
          entidade_id: string
          entidade_tipo: Database["public"]["Enums"]["qualification_entidade_tipo"]
          etapa: Database["public"]["Enums"]["qualification_etapa"]
          id: string
          motivo_id: string | null
          nota: number
          qualificado_por: string | null
        }
        Insert: {
          comentario?: string | null
          criado_em?: string
          entidade_id: string
          entidade_tipo: Database["public"]["Enums"]["qualification_entidade_tipo"]
          etapa: Database["public"]["Enums"]["qualification_etapa"]
          id?: string
          motivo_id?: string | null
          nota: number
          qualificado_por?: string | null
        }
        Update: {
          comentario?: string | null
          criado_em?: string
          entidade_id?: string
          entidade_tipo?: Database["public"]["Enums"]["qualification_entidade_tipo"]
          etapa?: Database["public"]["Enums"]["qualification_etapa"]
          id?: string
          motivo_id?: string | null
          nota?: number
          qualificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "qualification_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_qualificado_por_fkey"
            columns: ["qualificado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ativo: boolean
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          papel: Database["public"]["Enums"]["user_role"]
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          id: string
          nome: string
          papel: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          papel?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
        }
        Relationships: []
      }
      whatsapp_groups: {
        Row: {
          client_account_id: string | null
          criado_em: string
          group_jid: string | null
          id: string
          participantes: Json | null
        }
        Insert: {
          client_account_id?: string | null
          criado_em?: string
          group_jid?: string | null
          id?: string
          participantes?: Json | null
        }
        Update: {
          client_account_id?: string | null
          criado_em?: string
          group_jid?: string | null
          id?: string
          participantes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          client_account_id: string | null
          criado_em: string
          direcao: Database["public"]["Enums"]["whatsapp_direcao"]
          id: string
          lead_id: string | null
          midia_url: string | null
          remetente_id: string | null
          texto: string | null
          zapi_message_id: string | null
        }
        Insert: {
          client_account_id?: string | null
          criado_em?: string
          direcao: Database["public"]["Enums"]["whatsapp_direcao"]
          id?: string
          lead_id?: string | null
          midia_url?: string | null
          remetente_id?: string | null
          texto?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          client_account_id?: string | null
          criado_em?: string
          direcao?: Database["public"]["Enums"]["whatsapp_direcao"]
          id?: string
          lead_id?: string | null
          midia_url?: string | null
          remetente_id?: string | null
          texto?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_remetente_id_fkey"
            columns: ["remetente_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_deal_closer: { Args: { p_deal_id: string }; Returns: boolean }
      owns_client_account: {
        Args: { p_client_account_id: string }
        Returns: boolean
      }
      owns_deal: { Args: { p_deal_id: string }; Returns: boolean }
      owns_lead: { Args: { p_lead_id: string }; Returns: boolean }
    }
    Enums: {
      commission_status: "pendente" | "pago"
      contract_status_assinatura:
        | "pendente"
        | "enviado"
        | "assinado"
        | "cancelado"
      deal_status:
        | "em_negociacao"
        | "proposta_enviada"
        | "follow_up"
        | "fechado"
        | "perdido"
      lead_status:
        | "novo"
        | "em_atendimento"
        | "follow_up"
        | "reuniao_agendada"
        | "convertido"
        | "perdido"
      meeting_referencia_tipo: "lead" | "deal" | "client"
      meeting_status: "marcada" | "realizada" | "no_show" | "remarcada"
      meeting_tipo: "venda" | "acompanhamento"
      meta_event_name: "Lead" | "Qualified" | "Purchase"
      meta_event_status: "pendente" | "enviado" | "erro"
      qualification_entidade_tipo: "lead" | "deal"
      qualification_etapa: "sdr" | "closer"
      user_role: "sdr" | "closer" | "am" | "advogado" | "admin"
      whatsapp_direcao: "recebida" | "enviada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      commission_status: ["pendente", "pago"],
      contract_status_assinatura: [
        "pendente",
        "enviado",
        "assinado",
        "cancelado",
      ],
      deal_status: [
        "em_negociacao",
        "proposta_enviada",
        "follow_up",
        "fechado",
        "perdido",
      ],
      lead_status: [
        "novo",
        "em_atendimento",
        "follow_up",
        "reuniao_agendada",
        "convertido",
        "perdido",
      ],
      meeting_referencia_tipo: ["lead", "deal", "client"],
      meeting_status: ["marcada", "realizada", "no_show", "remarcada"],
      meeting_tipo: ["venda", "acompanhamento"],
      meta_event_name: ["Lead", "Qualified", "Purchase"],
      meta_event_status: ["pendente", "enviado", "erro"],
      qualification_entidade_tipo: ["lead", "deal"],
      qualification_etapa: ["sdr", "closer"],
      user_role: ["sdr", "closer", "am", "advogado", "admin"],
      whatsapp_direcao: ["recebida", "enviada"],
    },
  },
} as const

// Convenience aliases for the enum types above — re-add these after every
// `npm run db:types` regeneration, since supabase gen types only emits the
// raw Database shape and overwrites this whole file.
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type DealStatus = Database["public"]["Enums"]["deal_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type QualificationEtapa = Database["public"]["Enums"]["qualification_etapa"];
export type QualificationEntidadeTipo = Database["public"]["Enums"]["qualification_entidade_tipo"];
export type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
export type CommissionStatus = Database["public"]["Enums"]["commission_status"];
