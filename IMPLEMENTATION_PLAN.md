# 🚀 Implementation Plan: Performance & Security Fixes

## **🚨 HIGH PRIORITY FIXES**

### **1. Fix RLS Performance Issues**
**Issue**: `auth.<function>()` calls re-evaluated for each row causing poor performance
**Impact**: Critical performance degradation at scale
**Solution**: Replace with `(select auth.<function>())`

#### **1.1 Projects Table RLS Policies**
- [ ] Fix "Users can view their own projects" policy
- [ ] Fix "Users can insert their own projects" policy  
- [ ] Fix "Users can update their own projects" policy
- [ ] Fix "Users can delete their own projects" policy

#### **1.2 Tasks Table RLS Policies**
- [ ] Fix "Users can view tasks in their projects" policy
- [ ] Fix "Users can insert tasks in their projects" policy
- [ ] Fix "Users can update tasks in their projects or assigned to them" policy
- [ ] Fix "Users can delete tasks in their projects" policy

#### **1.3 Teams Table RLS Policies**
- [ ] Fix "Users can view public teams or their own teams" policy
- [ ] Fix "Users can insert their own teams" policy
- [ ] Fix "Users can update their own teams" policy
- [ ] Fix "Users can delete their own teams" policy

#### **1.4 All Other Tables (9 more tables)**
- [ ] Fix team_members table policies (4 policies)
- [ ] Fix documents table policies (4 policies)
- [ ] Fix summaries table policies (4 policies)
- [ ] Fix research_ideas table policies (4 policies)
- [ ] Fix chat_messages table policies (2 policies)
- [ ] Fix user_profiles table policies (3 policies)
- [ ] Fix activity_logs table policies (2 policies)
- [ ] Fix user_api_keys table policies (1 policy)

### **2. Add Missing Indexes**
**Issue**: Foreign keys without covering indexes
**Impact**: Suboptimal query performance

#### **2.1 Critical Missing Indexes**
- [ ] Add index on `chat_messages.sender_id`
- [ ] Add index on `teams.owner_id`

### **3. Enable Security Features**
**Issue**: Security features disabled or misconfigured
**Impact**: Security vulnerabilities

#### **3.1 Function Security**
- [ ] Fix `public.update_updated_at_column` search path
- [ ] Fix `public.handle_new_user` search path

#### **3.2 Auth Security (Manual Configuration)**
- [ ] Enable leaked password protection
- [ ] Configure additional MFA methods

## **🔧 MEDIUM PRIORITY FIXES**

### **4. Database Optimization**
**Issue**: Unused indexes and query performance
**Impact**: Unnecessary storage overhead and slower writes

#### **4.1 Remove Unused Indexes**
- [ ] Analyze and remove 20 unused indexes
- [ ] Keep only performance-critical indexes

#### **4.2 Consolidate Multiple Permissive Policies**
- [ ] Fix user_profiles table overlapping policies (10 warnings)

### **5. Complete Feature Implementation**
**Issue**: Incomplete real-time and file upload features
**Impact**: Missing core functionality

#### **5.1 Real-time Collaboration Server**
- [ ] Implement WebSocket server for real-time features
- [ ] Add Socket.io server configuration
- [ ] Integrate with existing team chat system

#### **5.2 File Upload System**
- [ ] Set up Supabase Storage buckets
- [ ] Implement file upload API routes
- [ ] Add file processing for documents table

## **📋 Implementation Sequence**

### **Phase 1: Critical Performance (30 min)**
1. Fix all RLS policies (33 policies across 11 tables)
2. Add missing indexes (2 indexes)

### **Phase 2: Security Hardening (15 min)**
3. Fix function search paths
4. Document auth security configuration steps

### **Phase 3: Database Optimization (20 min)**
5. Remove unused indexes
6. Consolidate overlapping policies

### **Phase 4: Feature Completion (45 min)**
7. Implement WebSocket server
8. Set up file upload system

## **🎯 Success Metrics**
- [ ] RLS performance warnings: 33 → 0
- [ ] Missing indexes warnings: 2 → 0
- [ ] Security warnings: 4 → 2 (2 require manual config)
- [ ] Unused indexes: 20 → 5 (keep critical ones)
- [ ] Real-time features: 70% → 95% complete
- [ ] File upload system: 60% → 90% complete

## **⏱️ Estimated Total Time: ~2 hours** 