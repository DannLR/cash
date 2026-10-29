# Configuração do Supabase para o Cash

## Preparar o banco de sincronização

1. Abra o projeto Cash no Supabase e entre em **SQL Editor**.
2. Abra `supabase/schema.sql` neste repositório, copie o conteúdo e execute-o.
3. Confirme em **Table Editor** que `cash_sync_events` foi criada e que RLS está ativado.

A tabela guarda alterações de forma isolada por usuário. As políticas permitem que uma sessão autenticada leia os próprios eventos e acrescente novos eventos; não há acesso anônimo nem chave administrativa no app.

## Ativar confirmação de e-mail

Em **Authentication → URL Configuration**:

- Configure **Site URL** com o endereço publicado do site Cash.
- Adicione o mesmo endereço à lista de URLs de redirecionamento.
- Adicione `http://localhost:8081/**` para desenvolvimento local.
- Adicione `cash://auth/callback` para os links de confirmação no APK.

Em **Authentication → Providers → Email**, mantenha o provedor de e-mail habilitado. O cadastro informa ao usuário quando precisa confirmar o endereço antes do primeiro acesso.

## Chaves

O cliente usa a URL do projeto e a chave `sb_publishable_...` fornecida para o Cash. Essa chave é pública e só pode ser usada com as políticas RLS instaladas. Nunca coloque `service_role` ou a senha do banco no app/site.
