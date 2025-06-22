1. Create the Users Table

-- Create users table
create table users (
  id uuid references auth.users not null primary key,
  full_name text,
  email text
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Create RLS policies for users table
create policy "Users can insert own data"
on public.users
for insert
to public
with check (id = auth.uid());

create policy "Users can update own data"
on public.users
for update
to public
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can view own data"
on public.users
for select
to public
using (id = auth.uid());


2. Create a Trigger Function

create function public.handle_new_user()
returns trigger as $$
begin
 insert into public.users (id, full_name, email)
 values (
   new.id,
   new.raw_user_meta_data->>'full_name',
   new.email
 );
 return new;
end;
$$ language plpgsql security definer;


3. Create a Trigger

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


4. Make the rest of the tables, RLS and RPC



  -- Chat Sessions Table
  create table
    public.chat_sessions (
      id uuid not null default extensions.uuid_generate_v4 (),
      user_id uuid not null,
      created_at timestamp with time zone not null default current_timestamp,
      updated_at timestamp with time zone not null default current_timestamp,
      chat_title null,
      constraint chat_sessions_pkey primary key (id),
      constraint chat_sessions_user_id_fkey foreign key (user_id) references users (id)
    ) tablespace pg_default;

  create index if not exists idx_chat_sessions_user_id on public.chat_sessions using btree (user_id) tablespace pg_default;

  create index if not exists chat_sessions_created_at_idx on public.chat_sessions using btree (created_at) tablespace pg_default;

  -- Chat Messages Table
  create table
    public.chat_messages (
      id uuid not null default extensions.uuid_generate_v4 (),
      chat_session_id uuid not null,
      content text null,
      is_user_message boolean not null,
      sources jsonb null,
      attachments jsonb null,
      tool_invocations null,
      created_at timestamp with time zone not null default current_timestamp,
      constraint chat_messages_pkey primary key (id),
      constraint chat_messages_chat_session_id_fkey foreign key (chat_session_id) references chat_sessions (id) on delete cascade
    ) tablespace pg_default;

  create index if not exists idx_chat_messages_chat_session_id on public.chat_messages using btree (chat_session_id) tablespace pg_default;
  -- Enable RLS for chat_messages
  alter table public.chat_messages enable row level security;

  -- Chat messages RLS policy
  create policy "Users can view messages from their sessions"
  on public.chat_messages
  as permissive
  for all
  to public
  using (
    chat_session_id IN (
      SELECT chat_sessions.id
      FROM chat_sessions
      WHERE chat_sessions.user_id = auth.uid()
    )
  );

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Note: PostgreSQL currently does not support indexing vectors with more than 2,000 dimensions. If you have hundreds of thousands of documents resulting in hundreds of thousands of vectors, you need to use an embedding model that produces 2,000 dimensions or fewer.

# Vector Database Configuration for Efficient Similarity Search

When dealing with hundreds of thousands of document vectors, optimizing for both storage and retrieval speed is critical. Our system has been configured using the following best practices:


-- Create the vector_documents table
CREATE TABLE public.user_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  total_pages integer NOT NULL,
  ai_description text NULL,
  ai_keyentities text[] NULL,
  ai_maintopics text[] NULL,
  ai_title text NULL,
  filter_tags text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_documents_pkey PRIMARY KEY (id),
  CONSTRAINT user_documents_user_title_unique UNIQUE (user_id, title),
  CONSTRAINT user_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Separate vector embeddings table
CREATE TABLE public.user_documents_vec (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  text_content text NOT NULL,
  page_number integer NOT NULL,
  embedding extensions.vector(1024) NULL,
  CONSTRAINT user_documents_vec_pkey PRIMARY KEY (id),
  CONSTRAINT user_documents_vec_document_page_unique UNIQUE (document_id, page_number),
  CONSTRAINT user_documents_vec_document_id_fkey FOREIGN KEY (document_id) REFERENCES user_documents (id) ON DELETE CASCADE
) TABLESPACE pg_default;

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents_vec ENABLE ROW LEVEL SECURITY;

-- RLS policy for user_documents - users can only access their own documents
CREATE POLICY "Users can only access their own documents" ON public.user_documents
    FOR ALL
    TO public
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can only access their own document vectors" ON public.user_documents_vec
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM user_documents
            WHERE user_documents.id = user_documents_vec.document_id
            AND user_documents.user_id = (SELECT auth.uid())
        )
    );


-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id
ON public.user_documents USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_documents_filter_tags
ON public.user_documents USING btree (filter_tags) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_documents_vec_document_id
ON public.user_documents_vec USING btree (document_id) TABLESPACE pg_default;

-- Create HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS user_documents_vec_embedding_idx
ON public.user_documents_vec
USING hnsw (embedding extensions.vector_l2_ops)
WITH (m = '16', ef_construction = '64')
TABLESPACE pg_default;


## HNSW Index Configuration

The Hierarchical Navigable Small World (HNSW) index is configured with:

- **m = 16**: Maximum number of connections per layer
- **ef_construction = 64**: Size of the dynamic candidate list during construction

These parameters balance build time, index size, and query performance for our document volumes. The HNSW index drastically improves vector similarity search performance while maintaining high recall rates.

## Why These Parameters?

- **Dimension Size (1024)**: Our embedding model (voyage-3-large) produces 1024-dimensional vectors, well under the pgvector 2000-dimension limit
- **HNSW Algorithm**: Offers logarithmic search complexity, critical for large document collections
- **Cosine Similarity**: Best metric for normalized document embeddings

These optimizations enable sub-second query times even with hundreds of thousands of document vectors in the database.

Above 500k rows you should consider increasing m and ef_construction to m = '32' and ef_construction = '128'

-- Enable RLS
ALTER TABLE public.vector_documents ENABLE ROW LEVEL SECURITY;

-- Optimized RLS Policies for vector_documents
CREATE POLICY "Users can only read their own documents"
ON public.vector_documents
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Users Table RLS Policies
CREATE POLICY "Users can insert own data"
ON public.users
FOR INSERT
TO public
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own data"
ON public.users
FOR UPDATE
TO public
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can view own data"
ON public.users
FOR SELECT
TO public
USING (id = (SELECT auth.uid()));

-- Chat Sessions RLS Policies
CREATE POLICY "Users can view own chat sessions"
ON public.chat_sessions
AS PERMISSIVE
FOR ALL
TO public
USING (user_id = (SELECT auth.uid()));

-- Chat Messages RLS Policies
CREATE POLICY "Users can view messages from their sessions"
ON public.chat_messages
AS PERMISSIVE
FOR ALL
TO public
USING (
  chat_session_id IN (
      SELECT chat_sessions.id
      FROM chat_sessions
      WHERE chat_sessions.user_id = (SELECT auth.uid())
  )
);

-- Create the similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_count int,
  filter_user_id uuid,
  filter_files text[],
  similarity_threshold float DEFAULT 0.30
)
RETURNS TABLE (
  id uuid,
  text_content text,
  title text,
  doc_timestamp timestamp with time zone,
  ai_title text,
  ai_description text,
  ai_maintopics text[],
  ai_keyentities text[],
  filter_tags text,
  page_number integer,
  total_pages integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vec.id,
    vec.text_content,
    doc.title,
    doc.created_at as doc_timestamp,
    doc.ai_title,
    doc.ai_description,
    doc.ai_maintopics,
    doc.ai_keyentities,
    doc.filter_tags,
    vec.page_number,
    doc.total_pages,
    1 - (vec.embedding <=> query_embedding) as similarity
  FROM
    user_documents_vec vec
  INNER JOIN
    user_documents doc ON vec.document_id = doc.id
  WHERE
    doc.user_id = filter_user_id
    AND doc.filter_tags = ANY(filter_files)
    AND 1 - (vec.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    vec.embedding <=> query_embedding ASC
  LIMIT LEAST(match_count, 200);
END;
$$;

