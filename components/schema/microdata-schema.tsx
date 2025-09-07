/**
 * Schema.org Microdata Components for ThesisFlow-AI
 * Provides structured data markup for better search engine visibility
 * Based on official schema.org microdata documentation
 */

import React from 'react'

// Base Schema Component Interface
interface SchemaProps {
  children?: React.ReactNode
  className?: string
}

/**
 * SoftwareApplication Schema Component
 * Used for the main ThesisFlow-AI platform
 */
interface SoftwareApplicationProps extends SchemaProps {
  name: string
  description: string
  applicationCategory?: string
  operatingSystem?: string
  url?: string
  version?: string
  author?: {
    name: string
    type: 'Organization' | 'Person'
    url?: string
  }
  datePublished?: string
  dateModified?: string
  aggregateRating?: {
    ratingValue: number
    bestRating: number
    ratingCount: number
  }
  offers?: {
    price: string
    priceCurrency: string
    availability: string
  }
}

export function SoftwareApplication({
  children,
  className,
  name,
  description,
  applicationCategory = "EducationalApplication",
  operatingSystem = "Web Browser",
  url,
  version,
  author,
  datePublished,
  dateModified,
  aggregateRating,
  offers
}: SoftwareApplicationProps) {
  return (
    <div 
      itemScope 
      itemType="https://schema.org/SoftwareApplication"
      className={className}
    >
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      <meta itemProp="applicationCategory" content={applicationCategory} />
      <meta itemProp="operatingSystem" content={operatingSystem} />
      
      {url && <link itemProp="url" href={url} />}
      {version && <meta itemProp="softwareVersion" content={version} />}
      {datePublished && <meta itemProp="datePublished" content={datePublished} />}
      {dateModified && <meta itemProp="dateModified" content={dateModified} />}
      
      {author && (
        <div itemProp="author" itemScope itemType={`https://schema.org/${author.type}`}>
          <meta itemProp="name" content={author.name} />
          {author.url && <link itemProp="url" href={author.url} />}
        </div>
      )}
      
      {aggregateRating && (
        <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
          <meta itemProp="ratingValue" content={aggregateRating.ratingValue.toString()} />
          <meta itemProp="bestRating" content={aggregateRating.bestRating.toString()} />
          <meta itemProp="ratingCount" content={aggregateRating.ratingCount.toString()} />
        </div>
      )}
      
      {offers && (
        <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="price" content={offers.price} />
          <meta itemProp="priceCurrency" content={offers.priceCurrency} />
          <link itemProp="availability" href={`https://schema.org/${offers.availability}`} />
        </div>
      )}
      
      {children}
    </div>
  )
}

/**
 * WebPage Schema Component
 * Used for individual pages within the application
 */
interface WebPageProps extends SchemaProps {
  name: string
  description: string
  url?: string
  datePublished?: string
  dateModified?: string
  author?: {
    name: string
    type: 'Organization' | 'Person'
  }
  breadcrumb?: Array<{
    name: string
    url: string
  }>
}

export function WebPage({
  children,
  className,
  name,
  description,
  url,
  datePublished,
  dateModified,
  author,
  breadcrumb
}: WebPageProps) {
  return (
    <div 
      itemScope 
      itemType="https://schema.org/WebPage"
      className={className}
    >
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      
      {url && <link itemProp="url" href={url} />}
      {datePublished && <meta itemProp="datePublished" content={datePublished} />}
      {dateModified && <meta itemProp="dateModified" content={dateModified} />}
      
      {author && (
        <div itemProp="author" itemScope itemType={`https://schema.org/${author.type}`}>
          <meta itemProp="name" content={author.name} />
        </div>
      )}
      
      {breadcrumb && breadcrumb.length > 0 && (
        <nav itemProp="breadcrumb" itemScope itemType="https://schema.org/BreadcrumbList">
          {breadcrumb.map((crumb, index) => (
            <div 
              key={index}
              itemProp="itemListElement" 
              itemScope 
              itemType="https://schema.org/ListItem"
            >
              <meta itemProp="position" content={(index + 1).toString()} />
              <link itemProp="item" href={crumb.url} />
              <meta itemProp="name" content={crumb.name} />
            </div>
          ))}
        </nav>
      )}
      
      {children}
    </div>
  )
}

/**
 * ResearchProject Schema Component
 * Used for individual research projects and ideas
 */
interface ResearchProjectProps extends SchemaProps {
  name: string
  description: string
  startDate?: string
  endDate?: string
  status?: string
  researcher?: {
    name: string
    type: 'Person' | 'Organization'
  }
  fundingSource?: string
  keywords?: string[]
}

export function ResearchProject({
  children,
  className,
  name,
  description,
  startDate,
  endDate,
  status,
  researcher,
  fundingSource,
  keywords
}: ResearchProjectProps) {
  return (
    <div 
      itemScope 
      itemType="https://schema.org/ResearchProject"
      className={className}
    >
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      
      {startDate && <meta itemProp="startDate" content={startDate} />}
      {endDate && <meta itemProp="endDate" content={endDate} />}
      {status && <meta itemProp="status" content={status} />}
      {fundingSource && <meta itemProp="funder" content={fundingSource} />}
      
      {researcher && (
        <div itemProp="researcher" itemScope itemType={`https://schema.org/${researcher.type}`}>
          <meta itemProp="name" content={researcher.name} />
        </div>
      )}
      
      {keywords && keywords.length > 0 && (
        <>
          {keywords.map((keyword, index) => (
            <meta key={index} itemProp="keywords" content={keyword} />
          ))}
        </>
      )}
      
      {children}
    </div>
  )
}

/**
 * ScholarlyArticle Schema Component
 * Used for research papers and academic documents
 */
interface ScholarlyArticleProps extends SchemaProps {
  headline: string
  abstract?: string
  author?: Array<{
    name: string
    affiliation?: string
  }>
  datePublished?: string
  journal?: string
  volume?: string
  issue?: string
  pageStart?: string
  pageEnd?: string
  doi?: string
  url?: string
  keywords?: string[]
  citation?: string[]
}

export function ScholarlyArticle({
  children,
  className,
  headline,
  abstract,
  author,
  datePublished,
  journal,
  volume,
  issue,
  pageStart,
  pageEnd,
  doi,
  url,
  keywords,
  citation
}: ScholarlyArticleProps) {
  return (
    <article 
      itemScope 
      itemType="https://schema.org/ScholarlyArticle"
      className={className}
    >
      <meta itemProp="headline" content={headline} />
      {abstract && <meta itemProp="abstract" content={abstract} />}
      {datePublished && <meta itemProp="datePublished" content={datePublished} />}
      {journal && <meta itemProp="isPartOf" content={journal} />}
      {volume && <meta itemProp="volumeNumber" content={volume} />}
      {issue && <meta itemProp="issueNumber" content={issue} />}
      {pageStart && <meta itemProp="pageStart" content={pageStart} />}
      {pageEnd && <meta itemProp="pageEnd" content={pageEnd} />}
      {doi && <meta itemProp="identifier" content={doi} />}
      {url && <link itemProp="url" href={url} />}
      
      {author && author.length > 0 && (
        <>
          {author.map((auth, index) => (
            <div key={index} itemProp="author" itemScope itemType="https://schema.org/Person">
              <meta itemProp="name" content={auth.name} />
              {auth.affiliation && (
                <div itemProp="affiliation" itemScope itemType="https://schema.org/Organization">
                  <meta itemProp="name" content={auth.affiliation} />
                </div>
              )}
            </div>
          ))}
        </>
      )}
      
      {keywords && keywords.length > 0 && (
        <>
          {keywords.map((keyword, index) => (
            <meta key={index} itemProp="keywords" content={keyword} />
          ))}
        </>
      )}
      
      {citation && citation.length > 0 && (
        <>
          {citation.map((cite, index) => (
            <meta key={index} itemProp="citation" content={cite} />
          ))}
        </>
      )}
      
      {children}
    </article>
  )
}

/**
 * Organization Schema Component
 * Used for the ThesisFlow-AI company/platform
 */
interface OrganizationProps extends SchemaProps {
  name: string
  description: string
  url?: string
  logo?: string
  foundingDate?: string
  email?: string
  address?: {
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  sameAs?: string[]
}

export function Organization({
  children,
  className,
  name,
  description,
  url,
  logo,
  foundingDate,
  email,
  address,
  sameAs
}: OrganizationProps) {
  return (
    <div 
      itemScope 
      itemType="https://schema.org/Organization"
      className={className}
    >
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      
      {url && <link itemProp="url" href={url} />}
      {logo && <link itemProp="logo" href={logo} />}
      {foundingDate && <meta itemProp="foundingDate" content={foundingDate} />}
      {email && <meta itemProp="email" content={email} />}
      
      {address && (
        <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
          {address.streetAddress && <meta itemProp="streetAddress" content={address.streetAddress} />}
          {address.addressLocality && <meta itemProp="addressLocality" content={address.addressLocality} />}
          {address.addressRegion && <meta itemProp="addressRegion" content={address.addressRegion} />}
          {address.postalCode && <meta itemProp="postalCode" content={address.postalCode} />}
          {address.addressCountry && <meta itemProp="addressCountry" content={address.addressCountry} />}
        </div>
      )}
      
      {sameAs && sameAs.length > 0 && (
        <>
          {sameAs.map((link, index) => (
            <link key={index} itemProp="sameAs" href={link} />
          ))}
        </>
      )}
      
      {children}
    </div>
  )
}

/**
 * Product Schema Component
 * Used for features and tools within the platform
 */
interface ProductProps extends SchemaProps {
  name: string
  description: string
  category?: string
  brand?: string
  manufacturer?: string
  url?: string
  image?: string
  aggregateRating?: {
    ratingValue: number
    bestRating: number
    ratingCount: number
  }
  offers?: {
    price: string
    priceCurrency: string
    availability: string
  }
}

export function Product({
  children,
  className,
  name,
  description,
  category,
  brand,
  manufacturer,
  url,
  image,
  aggregateRating,
  offers
}: ProductProps) {
  return (
    <div 
      itemScope 
      itemType="https://schema.org/Product"
      className={className}
    >
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      
      {category && <meta itemProp="category" content={category} />}
      {brand && <meta itemProp="brand" content={brand} />}
      {manufacturer && <meta itemProp="manufacturer" content={manufacturer} />}
      {url && <link itemProp="url" href={url} />}
      {image && <link itemProp="image" href={image} />}
      
      {aggregateRating && (
        <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
          <meta itemProp="ratingValue" content={aggregateRating.ratingValue.toString()} />
          <meta itemProp="bestRating" content={aggregateRating.bestRating.toString()} />
          <meta itemProp="ratingCount" content={aggregateRating.ratingCount.toString()} />
        </div>
      )}
      
      {offers && (
        <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="price" content={offers.price} />
          <meta itemProp="priceCurrency" content={offers.priceCurrency} />
          <link itemProp="availability" href={`https://schema.org/${offers.availability}`} />
        </div>
      )}
      
      {children}
    </div>
  )
}

/**
 * HOW-TO Schema Component
 * Used for tutorials and guides within the platform
 */
interface HowToProps extends SchemaProps {
  name: string
  description: string
  totalTime?: string
  supply?: string[]
  tool?: string[]
  steps: Array<{
    name: string
    text: string
    url?: string
    image?: string
  }>
}

export function HowTo({
  children,
  className,
  name,
  description,
  totalTime,
  supply,
  tool,
  steps
}: HowToProps) {
  return (
    <div 
      itemScope 
      itemType="https://schema.org/HowTo"
      className={className}
    >
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      
      {totalTime && <meta itemProp="totalTime" content={totalTime} />}
      
      {supply && supply.length > 0 && (
        <>
          {supply.map((item, index) => (
            <meta key={index} itemProp="supply" content={item} />
          ))}
        </>
      )}
      
      {tool && tool.length > 0 && (
        <>
          {tool.map((item, index) => (
            <meta key={index} itemProp="tool" content={item} />
          ))}
        </>
      )}
      
      {steps.map((step, index) => (
        <div key={index} itemProp="step" itemScope itemType="https://schema.org/HowToStep">
          <meta itemProp="position" content={(index + 1).toString()} />
          <meta itemProp="name" content={step.name} />
          <meta itemProp="text" content={step.text} />
          {step.url && <link itemProp="url" href={step.url} />}
          {step.image && <link itemProp="image" href={step.image} />}
        </div>
      ))}
      
      {children}
    </div>
  )
}
