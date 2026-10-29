import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// A URL do projeto e a chave publishable são próprias para uso no cliente.
// O acesso aos dados fica protegido pelas políticas RLS em supabase/schema.sql.
export const supabase = createClient(
  'https://ukyxebctznjjfkmbmjil.supabase.co',
  'sb_publishable_LrHs6tAvMra50ZpzGf50YQ_OrLh6ZkX',
  {
    auth: {
      ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);
