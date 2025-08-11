// Enterprise Knowledge Base System
import { neon } from '@neondatabase/serverless'

export interface KnowledgeArticle {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  category: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  visibility: 'public' | 'internal' | 'restricted'
  authorId: string
  authorName: string
  tenantId: string
  version: number
  parentId?: string // For versioning
  templateId?: string
  metadata: {
    readTime: number // minutes
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    lastReviewed?: Date
    reviewerId?: string
    attachments: string[]
    relatedArticles: string[]
    externalLinks: string[]
  }
  searchKeywords: string[]
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  viewCount: number
  upvotes: number
  downvotes: number
}

export interface ArticleCategory {
  id: string
  name: string
  slug: string
  description: string
  parentId?: string
  tenantId: string
  icon: string
  color: string
  order: number
  articleCount: number
  isActive: boolean
  createdAt: Date
}

export interface ArticleTemplate {
  id: string
  name: string
  description: string
  tenantId: string
  category: string
  structure: ArticleSection[]
  metadata: {
    requiredFields: string[]
    optionalFields: string[]
    defaultTags: string[]
    estimatedTime: number
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ArticleSection {
  id: string
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'image' | 'video' | 'table' | 'callout' | 'tabs'
  title?: string
  content: string
  order: number
  required: boolean
  placeholder?: string
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
  }
}

export interface ArticleRevision {
  id: string
  articleId: string
  version: number
  title: string
  content: string
  authorId: string
  changeLog: string
  createdAt: Date
  metadata: {
    wordsChanged: number
    sectionsModified: string[]
    changeType: 'major' | 'minor' | 'patch'
  }
}

export interface ArticleComment {
  id: string
  articleId: string
  userId: string
  userName: string
  content: string
  type: 'comment' | 'suggestion' | 'correction' | 'question'
  status: 'open' | 'resolved' | 'dismissed'
  parentId?: string // For replies
  isInternal: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SearchResult {
  article: KnowledgeArticle
  relevanceScore: number
  matchedFields: string[]
  highlights: {
    title?: string
    content?: string
    excerpt?: string
  }
}

export interface SearchFilters {
  categories?: string[]
  tags?: string[]
  status?: string[]
  visibility?: string[]
  difficulty?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  authorId?: string
}

export interface AnalyticsData {
  totalArticles: number
  publishedArticles: number
  totalViews: number
  totalVotes: number
  popularArticles: {
    id: string
    title: string
    views: number
    votes: number
  }[]
  categoryStats: {
    category: string
    articleCount: number
    viewCount: number
  }[]
  searchAnalytics: {
    topQueries: string[]
    noResultQueries: string[]
    clickThroughRate: number
  }
  userEngagement: {
    averageReadTime: number
    bounceRate: number
    returningReaders: number
  }
}

// Knowledge Base Manager
export class KnowledgeBaseManager {
  private sql: ReturnType<typeof neon>

  constructor() {
    this.sql = neon(process.env.DATABASE_URL!)
  }

  // Article Management
  async createArticle(article: Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'upvotes' | 'downvotes' | 'version' | 'slug'>): Promise<string> {
    const articleId = `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const slug = this.generateSlug(article.title)

    const fullArticle: KnowledgeArticle = {
      ...article,
      id: articleId,
      slug,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
      upvotes: 0,
      downvotes: 0,
      searchKeywords: this.extractKeywords(article.title + ' ' + article.content)
    }

    await this.storeArticle(fullArticle)
    
    // Create initial revision
    await this.createRevision({
      id: `rev_${Date.now()}`,
      articleId,
      version: 1,
      title: article.title,
      content: article.content,
      authorId: article.authorId,
      changeLog: 'Initial version',
      createdAt: new Date(),
      metadata: {
        wordsChanged: this.countWords(article.content),
        sectionsModified: ['all'],
        changeType: 'major'
      }
    })

    console.log(`Article created: ${articleId}`)
    return articleId
  }

  // Update article with versioning
  async updateArticle(articleId: string, updates: Partial<KnowledgeArticle>, authorId: string, changeLog: string): Promise<void> {
    const existingArticle = await this.getArticle(articleId)
    if (!existingArticle) {
      throw new Error('Article not found')
    }

    // Create new version
    const newVersion = existingArticle.version + 1
    const updatedArticle: KnowledgeArticle = {
      ...existingArticle,
      ...updates,
      id: articleId,
      version: newVersion,
      updatedAt: new Date(),
      searchKeywords: updates.title || updates.content 
        ? this.extractKeywords((updates.title || existingArticle.title) + ' ' + (updates.content || existingArticle.content))
        : existingArticle.searchKeywords
    }

    await this.storeArticle(updatedArticle)

    // Create revision
    await this.createRevision({
      id: `rev_${Date.now()}`,
      articleId,
      version: newVersion,
      title: updatedArticle.title,
      content: updatedArticle.content,
      authorId,
      changeLog,
      createdAt: new Date(),
      metadata: {
        wordsChanged: this.calculateWordChanges(existingArticle.content, updatedArticle.content),
        sectionsModified: this.detectSectionChanges(existingArticle, updatedArticle),
        changeType: this.determineChangeType(existingArticle, updatedArticle)
      }
    })

    console.log(`Article updated: ${articleId} (version ${newVersion})`)
  }

  // Advanced Search
  async searchArticles(query: string, filters: SearchFilters = {}, tenantId: string, limit = 20, offset = 0): Promise<{
    results: SearchResult[]
    total: number
    facets: {
      categories: Record<string, number>
      tags: Record<string, number>
      authors: Record<string, number>
    }
  }> {
    console.log(`Searching articles: "${query}" in tenant: ${tenantId}`)

    // Mock search implementation - would use full-text search
    const allArticles = await this.getArticles(tenantId, filters)
    
    // Simple text matching (in production, use Elasticsearch or similar)
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
    
    const results: SearchResult[] = allArticles
      .map(article => {
        const relevanceScore = this.calculateRelevance(article, searchTerms)
        if (relevanceScore === 0) return null

        return {
          article,
          relevanceScore,
          matchedFields: this.getMatchedFields(article, searchTerms),
          highlights: this.generateHighlights(article, searchTerms)
        }
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(offset, offset + limit)

    // Generate facets
    const facets = this.generateFacets(allArticles)

    return {
      results,
      total: results.length,
      facets
    }
  }

  // Category Management
  async createCategory(category: Omit<ArticleCategory, 'id' | 'createdAt' | 'articleCount'>): Promise<string> {
    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fullCategory: ArticleCategory = {
      ...category,
      id: categoryId,
      createdAt: new Date(),
      articleCount: 0
    }

    await this.storeCategory(fullCategory)
    console.log(`Category created: ${categoryId}`)
    return categoryId
  }

  // Template Management
  async createTemplate(template: Omit<ArticleTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fullTemplate: ArticleTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.storeTemplate(fullTemplate)
    console.log(`Template created: ${templateId}`)
    return templateId
  }

  // Article from Template
  async createArticleFromTemplate(templateId: string, data: Record<string, string>, authorId: string, tenantId: string): Promise<string> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Generate content from template
    const content = this.generateContentFromTemplate(template, data)
    
    const article = {
      title: data.title || 'Untitled Article',
      content,
      excerpt: data.excerpt || content.substring(0, 200) + '...',
      category: template.category,
      tags: [...template.metadata.defaultTags, ...(data.tags?.split(',') || [])],
      status: 'draft' as const,
      visibility: 'internal' as const,
      authorId,
      authorName: data.authorName || 'Unknown Author',
      tenantId,
      templateId,
      metadata: {
        readTime: Math.ceil(this.countWords(content) / 200),
        difficulty: 'intermediate' as const,
        attachments: [],
        relatedArticles: [],
        externalLinks: []
      }
    }

    return await this.createArticle(article)
  }

  // Comments and Collaboration
  async addComment(comment: Omit<ArticleComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fullComment: ArticleComment = {
      ...comment,
      id: commentId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.storeComment(fullComment)
    console.log(`Comment added: ${commentId}`)
    return commentId
  }

  // Analytics and Insights
  async getAnalytics(tenantId: string, period: { from: Date; to: Date }): Promise<AnalyticsData> {
    console.log(`Generating analytics for tenant: ${tenantId}`)

    // Mock analytics - would query actual data
    return {
      totalArticles: 150,
      publishedArticles: 120,
      totalViews: 25000,
      totalVotes: 1200,
      popularArticles: [
        { id: '1', title: 'QC Best Practices', views: 2500, votes: 150 },
        { id: '2', title: 'File Upload Guidelines', views: 2100, votes: 120 },
        { id: '3', title: 'Annotation Techniques', views: 1800, votes: 100 }
      ],
      categoryStats: [
        { category: 'Guidelines', articleCount: 45, viewCount: 12000 },
        { category: 'Tutorials', articleCount: 35, viewCount: 8500 },
        { category: 'FAQ', articleCount: 25, viewCount: 4500 }
      ],
      searchAnalytics: {
        topQueries: ['file upload', 'annotation', 'workflow', 'approval'],
        noResultQueries: ['advanced settings', 'api integration'],
        clickThroughRate: 0.75
      },
      userEngagement: {
        averageReadTime: 4.2,
        bounceRate: 0.25,
        returningReaders: 450
      }
    }
  }

  // AI-Powered Features
  async generateArticleSuggestions(query: string, tenantId: string): Promise<{
    suggestedTopics: string[]
    relatedArticles: KnowledgeArticle[]
    contentGaps: string[]
  }> {
    console.log(`Generating suggestions for query: "${query}"`)

    // Mock AI suggestions - would integrate with AI service
    return {
      suggestedTopics: [
        'Advanced QC Techniques for ' + query,
        'Common Issues with ' + query,
        'Best Practices for ' + query,
        'Troubleshooting ' + query
      ],
      relatedArticles: await this.getArticles(tenantId, { tags: [query] }),
      contentGaps: [
        'Missing beginner guide for ' + query,
        'No video content for ' + query,
        'Limited troubleshooting information'
      ]
    }
  }

  // Helper Methods
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - would use NLP in production
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)

    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word)
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length
  }

  private calculateRelevance(article: KnowledgeArticle, searchTerms: string[]): number {
    let score = 0

    // Title matches (highest weight)
    const titleWords = article.title.toLowerCase().split(' ')
    searchTerms.forEach(term => {
      if (titleWords.some(word => word.includes(term))) {
        score += 10
      }
    })

    // Content matches
    const contentWords = article.content.toLowerCase()
    searchTerms.forEach(term => {
      const matches = (contentWords.match(new RegExp(term, 'g')) || []).length
      score += matches * 2
    })

    // Tag matches
    searchTerms.forEach(term => {
      if (article.tags.some(tag => tag.toLowerCase().includes(term))) {
        score += 5
      }
    })

    // Keywords matches
    searchTerms.forEach(term => {
      if (article.searchKeywords.some(keyword => keyword.includes(term))) {
        score += 3
      }
    })

    return score
  }

  private getMatchedFields(article: KnowledgeArticle, searchTerms: string[]): string[] {
    const fields: string[] = []

    if (searchTerms.some(term => article.title.toLowerCase().includes(term))) {
      fields.push('title')
    }
    if (searchTerms.some(term => article.content.toLowerCase().includes(term))) {
      fields.push('content')
    }
    if (searchTerms.some(term => article.tags.some(tag => tag.toLowerCase().includes(term)))) {
      fields.push('tags')
    }

    return fields
  }

  private generateHighlights(article: KnowledgeArticle, searchTerms: string[]): SearchResult['highlights'] {
    const highlights: SearchResult['highlights'] = {}

    // Simple highlighting - would use proper highlighting library
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      
      if (article.title.toLowerCase().includes(term)) {
        highlights.title = article.title.replace(regex, '<mark>$1</mark>')
      }
      
      if (article.content.toLowerCase().includes(term)) {
        const sentences = article.content.split('. ')
        const matchingSentence = sentences.find(sentence => 
          sentence.toLowerCase().includes(term)
        )
        if (matchingSentence) {
          highlights.content = matchingSentence.replace(regex, '<mark>$1</mark>') + '...'
        }
      }
    })

    return highlights
  }

  private generateFacets(articles: KnowledgeArticle[]): {
    categories: Record<string, number>
    tags: Record<string, number>
    authors: Record<string, number>
  } {
    const facets = {
      categories: {} as Record<string, number>,
      tags: {} as Record<string, number>,
      authors: {} as Record<string, number>
    }

    articles.forEach(article => {
      // Categories
      facets.categories[article.category] = (facets.categories[article.category] || 0) + 1

      // Tags
      article.tags.forEach(tag => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1
      })

      // Authors
      facets.authors[article.authorName] = (facets.authors[article.authorName] || 0) + 1
    })

    return facets
  }

  private calculateWordChanges(oldContent: string, newContent: string): number {
    const oldWords = oldContent.split(/\s+/).length
    const newWords = newContent.split(/\s+/).length
    return Math.abs(newWords - oldWords)
  }

  private detectSectionChanges(oldArticle: KnowledgeArticle, newArticle: KnowledgeArticle): string[] {
    const changes: string[] = []

    if (oldArticle.title !== newArticle.title) changes.push('title')
    if (oldArticle.content !== newArticle.content) changes.push('content')
    if (JSON.stringify(oldArticle.tags) !== JSON.stringify(newArticle.tags)) changes.push('tags')
    if (oldArticle.category !== newArticle.category) changes.push('category')

    return changes
  }

  private determineChangeType(oldArticle: KnowledgeArticle, newArticle: KnowledgeArticle): 'major' | 'minor' | 'patch' {
    const wordChanges = this.calculateWordChanges(oldArticle.content, newArticle.content)
    const totalWords = this.countWords(newArticle.content)

    if (wordChanges > totalWords * 0.3) return 'major'
    if (wordChanges > totalWords * 0.1) return 'minor'
    return 'patch'
  }

  private generateContentFromTemplate(template: ArticleTemplate, data: Record<string, string>): string {
    let content = ''

    template.structure.forEach(section => {
      const sectionData = data[section.id] || section.placeholder || ''

      switch (section.type) {
        case 'heading':
          content += `# ${section.title || sectionData}\n\n`
          break
        case 'paragraph':
          content += `${sectionData}\n\n`
          break
        case 'list':
          const items = sectionData.split('\n').filter(item => item.trim())
          content += items.map(item => `- ${item}`).join('\n') + '\n\n'
          break
        case 'code':
          content += `\`\`\`\n${sectionData}\n\`\`\`\n\n`
          break
        default:
          content += `${sectionData}\n\n`
      }
    })

    return content.trim()
  }

  // Database operations (placeholders)
  private async storeArticle(article: KnowledgeArticle): Promise<void> {
    console.log(`Storing article: ${article.id}`)
  }

  private async getArticle(articleId: string): Promise<KnowledgeArticle | null> {
    console.log(`Getting article: ${articleId}`)
    return null
  }

  private async getArticles(tenantId: string, filters: SearchFilters): Promise<KnowledgeArticle[]> {
    console.log(`Getting articles for tenant: ${tenantId}`)
    return []
  }

  private async storeCategory(category: ArticleCategory): Promise<void> {
    console.log(`Storing category: ${category.id}`)
  }

  private async storeTemplate(template: ArticleTemplate): Promise<void> {
    console.log(`Storing template: ${template.id}`)
  }

  private async getTemplate(templateId: string): Promise<ArticleTemplate | null> {
    console.log(`Getting template: ${templateId}`)
    return null
  }

  private async createRevision(revision: ArticleRevision): Promise<void> {
    console.log(`Creating revision: ${revision.id}`)
  }

  private async storeComment(comment: ArticleComment): Promise<void> {
    console.log(`Storing comment: ${comment.id}`)
  }
}

// Export knowledge base manager instance
export const knowledgeBaseManager = new KnowledgeBaseManager()
