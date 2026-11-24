/* Cloud sync settings. The publishable key is meant to live in browser code;
   row level security on the `progress` table keeps each user's data private.
   Never put the service_role / secret key here. */
window.N3 = window.N3 || {};

N3.CLOUD = {
  url: 'https://trzsxhutadwabjiokksz.supabase.co',
  key: 'sb_publishable_5hN4bS3P2-DXVZAYPCXWmA_Ux_2Op3k'
};
