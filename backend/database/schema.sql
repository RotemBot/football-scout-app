-- Football Scout Database Schema
-- Created for Phase 1 implementation

-- Enable UUID extension for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sources table - track different football websites
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    url VARCHAR(500) NOT NULL,
    reliability_score INTEGER NOT NULL CHECK (reliability_score >= 1 AND reliability_score <= 100),
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Players table - store player information
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    position VARCHAR(50),
    age INTEGER,
    nationality VARCHAR(100),
    current_club VARCHAR(200),
    market_value_euros BIGINT,
    league VARCHAR(100),
    height_cm INTEGER,
    foot VARCHAR(10),
    goals_this_season INTEGER DEFAULT 0,
    assists_this_season INTEGER DEFAULT 0,
    appearances_this_season INTEGER DEFAULT 0,
    contract_expires DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Player sources - track which sources provided what player data
CREATE TABLE player_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    source_url VARCHAR(1000),
    data_quality_score INTEGER CHECK (data_quality_score >= 1 AND data_quality_score <= 100),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, source_id)
);

-- Search queries - store user search requests
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_text TEXT NOT NULL,
    parsed_criteria JSONB, -- Store AI-parsed search criteria
    user_ip VARCHAR(45), -- Support IPv4 and IPv6
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search results - track which players were returned for which searches
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    match_explanation TEXT,
    result_rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crawl logs - track crawling activity and errors
CREATE TABLE crawl_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    search_query_id UUID REFERENCES search_queries(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'timeout')),
    players_found INTEGER DEFAULT 0,
    error_message TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_age ON players(age);
CREATE INDEX idx_players_nationality ON players(nationality);
CREATE INDEX idx_players_current_club ON players(current_club);
CREATE INDEX idx_players_market_value ON players(market_value_euros);
CREATE INDEX idx_players_created_at ON players(created_at);

CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX idx_search_results_search_query_id ON search_results(search_query_id);
CREATE INDEX idx_search_results_match_score ON search_results(match_score);

CREATE INDEX idx_crawl_logs_source_id ON crawl_logs(source_id);
CREATE INDEX idx_crawl_logs_status ON crawl_logs(status);
CREATE INDEX idx_crawl_logs_created_at ON crawl_logs(created_at);

-- Insert initial source data
INSERT INTO sources (name, url, reliability_score, timeout_seconds) VALUES
('Transfermarkt', 'https://www.transfermarkt.co.uk', 95, 30),
('Soccerway', 'https://www.soccerway.com', 85, 30),
('Zerozero', 'https://www.zerozero.pt', 75, 30),
('Sofascore', 'https://www.sofascore.com', 80, 30);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 