# Extract Data v2 - QA Testing Matrix

## Phase 4: Comprehensive Quality Assurance

### Test Environment Setup
- **URL**: `/extract-v2` (or `/extract` with `NEXT_PUBLIC_EXTRACT_V2_ENABLED=true`)
- **Authentication**: Required (test with valid user account)
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen Readers**: NVDA, JAWS, VoiceOver
- **Mobile**: iOS Safari, Android Chrome

---

## 🧪 Functional Testing

### File Upload & Validation
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Valid PDF Upload** | Upload PDF ≤10MB | File accepted, extraction starts | ⏳ |
| **Valid DOCX Upload** | Upload DOCX ≤10MB | File accepted, extraction starts | ⏳ |
| **Valid PPTX Upload** | Upload PPTX ≤10MB | File accepted, extraction starts | ⏳ |
| **Valid CSV Upload** | Upload CSV ≤10MB | File accepted, extraction starts | ⏳ |
| **Valid TXT Upload** | Upload TXT ≤10MB | File accepted, extraction starts | ⏳ |
| **Invalid File Type** | Upload .exe or .zip | Error message, file rejected | ⏳ |
| **Oversized File** | Upload file >10MB | Error message, file rejected | ⏳ |
| **Multiple Files** | Upload 3 valid files | All files processed sequentially | ⏳ |
| **Empty File** | Upload 0-byte file | Error message, file rejected | ⏳ |
| **Corrupted File** | Upload corrupted PDF | Error message, graceful failure | ⏳ |

### Extraction Processing
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **PDF Text Extraction** | Upload text-heavy PDF | Text extracted, summary generated | ⏳ |
| **PDF Table Extraction** | Upload PDF with tables | Tables detected, data extracted | ⏳ |
| **DOCX Processing** | Upload complex DOCX | Content extracted, formatting preserved | ⏳ |
| **PPTX Processing** | Upload presentation | Slides processed, text extracted | ⏳ |
| **OCR Processing** | Upload scanned PDF | OCR enabled, text extracted | ⏳ |
| **Large Document** | Upload 100+ page PDF | Processing completes, progress shown | ⏳ |
| **Multi-language** | Upload non-English doc | Text extracted correctly | ⏳ |
| **Special Characters** | Upload doc with Unicode | Characters preserved, no corruption | ⏳ |
| **Extraction Cancellation** | Cancel mid-extraction | Process stops, UI resets | ⏳ |
| **Network Interruption** | Disconnect during upload | Error handling, retry option | ⏳ |

### Real-time Streaming
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Progress Updates** | Monitor extraction progress | Real-time progress 0-100% | ⏳ |
| **Phase Transitions** | Watch phase changes | Smooth transitions, correct labels | ⏳ |
| **Timeline Events** | Check activity timeline | Events appear in real-time | ⏳ |
| **Insights Generation** | Wait for AI insights | Summary and key points appear | ⏳ |
| **Table Detection** | Upload doc with tables | Table count updates live | ⏳ |
| **Entity Extraction** | Upload entity-rich doc | Entity count updates live | ⏳ |
| **Citation Detection** | Upload academic paper | Citations detected and listed | ⏳ |
| **Error Streaming** | Trigger extraction error | Error message streamed properly | ⏳ |
| **Connection Recovery** | Reconnect after disconnect | Stream resumes or restarts | ⏳ |
| **Multiple Sessions** | Run parallel extractions | Each session isolated | ⏳ |

---

## 💬 Chat Functionality

### Document-Grounded Chat
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Basic Chat** | Send "Summarize this document" | AI responds with document summary | ⏳ |
| **Context Awareness** | Ask follow-up questions | AI remembers conversation context | ⏳ |
| **Document References** | Ask about specific sections | AI references document content | ⏳ |
| **Table Questions** | Ask about table data | AI provides table-specific answers | ⏳ |
| **Entity Questions** | Ask about entities | AI discusses extracted entities | ⏳ |
| **Citation Queries** | Ask about references | AI mentions detected citations | ⏳ |
| **Multi-turn Conversation** | Have 10+ message exchange | Context preserved throughout | ⏳ |
| **Long Messages** | Send 1000+ character message | Message processed correctly | ⏳ |
| **Special Characters** | Send Unicode/emoji messages | Characters handled properly | ⏳ |
| **Empty Messages** | Send empty message | Validation prevents sending | ⏳ |

### Advanced Chat Settings
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Provider Selection** | Change from Auto to OpenRouter | Setting applied to next message | ⏳ |
| **Model Selection** | Select specific model | Model used for response | ⏳ |
| **Temperature Control** | Adjust temperature slider | Response creativity changes | ⏳ |
| **Max Tokens** | Change token limit | Response length respects limit | ⏳ |
| **Cost Preview** | Check usage stats | Token count and cost shown | ⏳ |
| **Model Fallback** | Trigger model failure | Automatic fallback to next model | ⏳ |
| **Settings Persistence** | Refresh page | Settings remembered | ⏳ |
| **Reset Settings** | Reset to defaults | All settings return to Auto | ⏳ |

### Chat Streaming
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Token Streaming** | Send message | Response appears token by token | ⏳ |
| **Stream Interruption** | Abort during response | Stream stops, partial response shown | ⏳ |
| **Long Response** | Request detailed analysis | Long response streams smoothly | ⏳ |
| **Error Handling** | Trigger chat error | Error message displayed properly | ⏳ |
| **Concurrent Chats** | Multiple browser tabs | Each chat session isolated | ⏳ |

---

## 📊 Data Visualization

### Viewer Tabs
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **File Tab** | Click File tab | Document preview shown | ⏳ |
| **Summary Tab** | Click Summary tab | AI summary and key points | ⏳ |
| **Tables Tab** | Click Tables tab | Extracted tables displayed | ⏳ |
| **Entities Tab** | Click Entities tab | Entities grouped by type | ⏳ |
| **Citations Tab** | Click Citations tab | Citations with links | ⏳ |
| **Raw JSON Tab** | Click Raw JSON tab | Complete extraction data | ⏳ |
| **Tab Navigation** | Use keyboard arrows | Tabs navigate with keyboard | ⏳ |
| **Tab Persistence** | Refresh page | Active tab remembered | ⏳ |
| **Empty States** | No data available | Appropriate empty state shown | ⏳ |
| **Loading States** | During extraction | Loading indicators shown | ⏳ |

### Export Functionality
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **CSV Export** | Export tables as CSV | Valid CSV file downloaded | ⏳ |
| **JSON Export** | Export data as JSON | Valid JSON file downloaded | ⏳ |
| **Large Export** | Export 1000+ rows | Export completes successfully | ⏳ |
| **Empty Export** | Export with no data | Appropriate handling/message | ⏳ |
| **Special Characters** | Export Unicode data | Characters preserved in export | ⏳ |
| **File Naming** | Check export filename | Descriptive, unique filename | ⏳ |

---

## 🎯 Timeline & Replay

### Timeline Functionality
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Timeline Display** | View activity timeline | Events listed chronologically | ⏳ |
| **Timeline Replay** | Click replay button | Events replay with timing | ⏳ |
| **Replay Controls** | Use play/pause/reset | Controls work as expected | ⏳ |
| **Replay Progress** | Watch progress bar | Progress updates during replay | ⏳ |
| **Timeline Persistence** | Refresh during replay | Timeline data preserved | ⏳ |
| **Large Timeline** | 100+ events | Performance remains smooth | ⏳ |
| **Timeline Search** | Search timeline events | Events filtered correctly | ⏳ |
| **Event Details** | Click timeline event | Event details shown | ⏳ |

---

## ♿ Accessibility Testing

### Keyboard Navigation
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Tab Order** | Tab through interface | Logical tab order maintained | ⏳ |
| **Skip Links** | Use skip navigation | Skip links work correctly | ⏳ |
| **Tab Navigation** | Arrow keys on tabs | Tabs navigate with arrows | ⏳ |
| **Button Activation** | Space/Enter on buttons | Buttons activate correctly | ⏳ |
| **Modal Navigation** | Tab within modals | Focus trapped in modal | ⏳ |
| **Dropdown Navigation** | Arrow keys in dropdowns | Options navigate with arrows | ⏳ |
| **Focus Indicators** | Tab to elements | Clear focus indicators shown | ⏳ |
| **Focus Management** | After actions | Focus moves appropriately | ⏳ |

### Screen Reader Support
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Page Structure** | Navigate with headings | Proper heading hierarchy | ⏳ |
| **Form Labels** | Navigate form fields | All fields properly labeled | ⏳ |
| **Button Descriptions** | Navigate buttons | Buttons have clear descriptions | ⏳ |
| **Status Updates** | Monitor progress | Progress announced to SR | ⏳ |
| **Error Messages** | Trigger errors | Errors announced clearly | ⏳ |
| **Dynamic Content** | Watch live updates | Updates announced appropriately | ⏳ |
| **Table Navigation** | Navigate data tables | Tables have proper headers | ⏳ |
| **Link Context** | Navigate links | Links have sufficient context | ⏳ |

### ARIA Implementation
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **ARIA Labels** | Check with inspector | Proper aria-label attributes | ⏳ |
| **ARIA Roles** | Check interactive elements | Appropriate roles assigned | ⏳ |
| **ARIA States** | Check dynamic states | States update correctly | ⏳ |
| **ARIA Descriptions** | Check complex elements | Descriptions provide context | ⏳ |
| **Live Regions** | Check dynamic updates | Live regions announce changes | ⏳ |
| **ARIA Expanded** | Check collapsible elements | Expanded state tracked | ⏳ |

---

## 🚀 Performance Testing

### Load Performance
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Page Load Time** | Measure initial load | <3 seconds to interactive | ⏳ |
| **Large File Processing** | Upload 10MB file | Processing completes <5 min | ⏳ |
| **Multiple Files** | Upload 5 files | All process without timeout | ⏳ |
| **Memory Usage** | Monitor during extraction | Memory usage stays reasonable | ⏳ |
| **CPU Usage** | Monitor during processing | CPU usage doesn't spike | ⏳ |
| **Network Efficiency** | Monitor requests | Minimal unnecessary requests | ⏳ |
| **Caching** | Reload page | Static assets cached | ⏳ |
| **Bundle Size** | Check network tab | JavaScript bundles optimized | ⏳ |

### Stress Testing
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Concurrent Users** | 10 simultaneous extractions | System handles load | ⏳ |
| **Long Sessions** | Keep page open 8+ hours | No memory leaks | ⏳ |
| **Rapid Interactions** | Click rapidly | UI remains responsive | ⏳ |
| **Large Documents** | 1000+ page PDF | Processing completes | ⏳ |
| **Many Tables** | Document with 100+ tables | All tables extracted | ⏳ |
| **Unicode Stress** | Document with complex Unicode | Characters handled correctly | ⏳ |

---

## 📱 Mobile & Responsive

### Mobile Functionality
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Mobile Layout** | View on phone | Layout adapts properly | ⏳ |
| **Touch Interactions** | Tap buttons/links | Touch targets adequate | ⏳ |
| **File Upload** | Upload from mobile | File picker works | ⏳ |
| **Chat Interface** | Use chat on mobile | Chat usable on small screen | ⏳ |
| **Scrolling** | Scroll through content | Smooth scrolling | ⏳ |
| **Orientation** | Rotate device | Layout adapts to orientation | ⏳ |
| **Zoom** | Pinch to zoom | Content remains usable | ⏳ |
| **Keyboard** | Use virtual keyboard | Keyboard doesn't obscure content | ⏳ |

### Tablet Testing
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Tablet Layout** | View on tablet | Optimal use of screen space | ⏳ |
| **Touch Precision** | Precise touch interactions | Elements easy to target | ⏳ |
| **Split Screen** | Use in split screen | App remains functional | ⏳ |

---

## 🔒 Security Testing

### Input Validation
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **XSS Prevention** | Upload malicious HTML | Content sanitized | ⏳ |
| **File Type Validation** | Rename .exe to .pdf | File rejected based on content | ⏳ |
| **Size Limits** | Attempt oversized upload | Upload rejected | ⏳ |
| **SQL Injection** | Malicious chat input | Input sanitized | ⏳ |
| **Path Traversal** | Malicious filenames | Filenames sanitized | ⏳ |

### Authentication
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Unauthenticated Access** | Access without login | Redirected to login | ⏳ |
| **Session Expiry** | Wait for session timeout | Graceful session handling | ⏳ |
| **Token Validation** | Manipulate auth tokens | Invalid tokens rejected | ⏳ |

---

## 🌐 Browser Compatibility

### Chrome Testing
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Chrome 90+** | Test all features | Full functionality | ⏳ |
| **Chrome Mobile** | Test on Android | Mobile features work | ⏳ |

### Firefox Testing
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Firefox 88+** | Test all features | Full functionality | ⏳ |
| **Firefox Mobile** | Test on Android | Mobile features work | ⏳ |

### Safari Testing
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Safari 14+** | Test all features | Full functionality | ⏳ |
| **Safari iOS** | Test on iPhone/iPad | Mobile features work | ⏳ |

### Edge Testing
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Edge 90+** | Test all features | Full functionality | ⏳ |

---

## 📈 Analytics & Telemetry

### Telemetry Tracking
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Extraction Events** | Complete extraction | Events tracked in DB | ⏳ |
| **Chat Events** | Send chat messages | Chat metrics tracked | ⏳ |
| **Export Events** | Export data | Export actions tracked | ⏳ |
| **Error Events** | Trigger errors | Errors logged for analysis | ⏳ |
| **Performance Metrics** | Monitor timing | Performance data collected | ⏳ |
| **User Analytics** | View analytics dashboard | Metrics displayed correctly | ⏳ |

---

## 🔄 Integration Testing

### Database Integration
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **Extraction Storage** | Complete extraction | Data saved to Supabase | ⏳ |
| **Chat Storage** | Send messages | Messages saved to DB | ⏳ |
| **Timeline Storage** | Generate timeline | Events saved to DB | ⏳ |
| **User Data** | Check user association | Data linked to correct user | ⏳ |
| **Data Retrieval** | Load recent extractions | Data retrieved correctly | ⏳ |

### API Integration
| Test Case | Steps | Expected Result | Status |
|-----------|-------|----------------|--------|
| **OpenRouter API** | Send chat message | API responds correctly | ⏳ |
| **File Processing** | Upload various formats | All formats processed | ⏳ |
| **Rate Limiting** | Exceed rate limits | Proper rate limit handling | ⏳ |
| **Error Handling** | API failures | Graceful error handling | ⏳ |

---

## 📋 Test Status Legend
- ⏳ **Pending**: Test not yet executed
- ✅ **Pass**: Test passed successfully  
- ❌ **Fail**: Test failed, needs fixing
- ⚠️ **Warning**: Test passed with minor issues
- 🔄 **Retest**: Test needs to be re-executed

---

## 🎯 Test Execution Notes

### Pre-Test Setup
1. Ensure test environment is clean
2. Clear browser cache and cookies
3. Verify authentication works
4. Check database connectivity
5. Confirm API keys are valid

### Test Data Requirements
- Sample PDF files (small, medium, large)
- Sample DOCX files with tables
- Sample PPTX presentations
- Sample CSV files
- Corrupted/invalid files for negative testing
- Unicode test documents
- Academic papers with citations

### Post-Test Cleanup
1. Clear test data from database
2. Reset user accounts
3. Clear uploaded files
4. Reset telemetry data

---

## 📊 Test Metrics

### Success Criteria
- **Functional Tests**: 95% pass rate
- **Accessibility Tests**: 100% pass rate  
- **Performance Tests**: 90% pass rate
- **Security Tests**: 100% pass rate
- **Browser Compatibility**: 95% pass rate

### Performance Benchmarks
- Page load: <3 seconds
- File upload: <30 seconds for 10MB
- Extraction: <5 minutes for 100 pages
- Chat response: <10 seconds
- Export: <30 seconds for 1000 rows

---

*Last Updated: Phase 4 Implementation*
*Next Review: After Phase 4 completion*
