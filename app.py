from flask import Flask, render_template, request, jsonify
import requests
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import random
import os
import socket
import ssl
import urllib3
from urllib.parse import urlparse
import dns.resolver
import subprocess
import re

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Enhanced User agents for better evasion
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0'
]

def load_massive_wordlist():
    """Load comprehensive subdomain wordlist"""
    wordlist_path = os.path.join('static', 'wordlists', 'subdomains.txt')
    try:
        with open(wordlist_path, 'r') as f:
            wordlist = [line.strip() for line in f.readlines() if line.strip()]
        print(f"Loaded {len(wordlist)} subdomains from wordlist file")
        return wordlist
    except FileNotFoundError:
        print("Wordlist file not found, generating default wordlist")
        return generate_default_wordlist()

def generate_default_wordlist():
    """Generate comprehensive subdomain wordlist with 1000+ entries"""
    base_words = [
        'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'webdisk', 'ns2', 'cpanel', 'whm',
        'autodiscover', 'autoconfig', 'mx', 'test', 'dev', 'staging', 'admin', 'api', 'blog', 'shop', 'forum',
        'support', 'help', 'secure', 'vpn', 'remote', 'demo', 'beta', 'alpha', 'mobile', 'm', 'wap', 'portal',
        'news', 'media', 'static', 'cdn', 'assets', 'img', 'images', 'css', 'js', 'video', 'videos', 'download',
        'downloads', 'store', 'app', 'apps', 'service', 'services', 'cloud', 'backup', 'old', 'new', 'temp',
        'tmp', 'archive', 'files', 'file', 'docs', 'doc', 'www2', 'www3', 'mail2', 'ftp2', 'ns3', 'ns4', 'dns',
        'dns1', 'dns2', 'mx1', 'mx2', 'mx3', 'exchange', 'imap', 'pop3', 'webmin', 'panel', 'control', 'dashboard',
        'manage', 'manager', 'admin2', 'administrator', 'root', 'user', 'users', 'client', 'clients', 'customer',
        'customers', 'member', 'members', 'login', 'signin', 'signup', 'register', 'account', 'accounts', 'profile',
        'profiles', 'settings', 'config', 'configuration', 'preferences', 'prefs', 'options', 'tools', 'tool',
        'utility', 'utilities', 'script', 'scripts', 'cgi', 'cgi-bin', 'bin', 'sbin', 'usr', 'var', 'cache',
        'log', 'logs', 'backups', 'archives', 'testing', 'stage', 'devel', 'development', 'prod', 'production',
        'live', 'sample', 'example', 'trial', 'rc', 'release', 'stable', 'master', 'main', 'www1', 'www4',
        'www5', 'web', 'web1', 'web2', 'web3', 'site', 'sites', 'page', 'pages', 'home', 'homepage', 'index',
        'default', 'primary', 'secondary', 'tertiary', 'first', 'second', 'third', 'fourth', 'fifth'
    ]
    
    # Technology and service subdomains
    tech_words = [
        'jenkins', 'gitlab', 'github', 'bitbucket', 'jira', 'confluence', 'bamboo', 'sonar', 'nexus',
        'artifactory', 'docker', 'kubernetes', 'k8s', 'grafana', 'prometheus', 'kibana', 'elasticsearch',
        'logstash', 'redis', 'mongodb', 'postgres', 'mysql', 'oracle', 'mssql', 'cassandra', 'rabbitmq',
        'kafka', 'zookeeper', 'consul', 'vault', 'nomad', 'terraform', 'ansible', 'nagios', 'zabbix',
        'splunk', 'datadog', 'newrelic', 'pingdom', 'statuspage', 'wordpress', 'drupal', 'joomla',
        'magento', 'shopify', 'prestashop', 'opencart', 'laravel', 'symfony', 'django', 'flask',
        'rails', 'express', 'angular', 'react', 'vue', 'nginx', 'apache', 'iis', 'tomcat', 'jetty',
        'wildfly', 'glassfish', 'websphere', 'cloudflare', 'fastly', 'akamai', 'maxcdn', 'keycdn',
        'cloudfront', 's3', 'ec2', 'rds', 'lambda', 'azure', 'gcp', 'aws', 'heroku', 'vercel',
        'netlify', 'firebase', 'supabase', 'planetscale', 'railway', 'fly', 'render'
    ]
    
    # Common service patterns
    service_patterns = [
        'auth', 'oauth', 'sso', 'ldap', 'ad', 'directory', 'identity', 'saml', 'cas', 'openid',
        'payment', 'pay', 'billing', 'invoice', 'checkout', 'cart', 'order', 'orders', 'shop',
        'ecommerce', 'commerce', 'merchant', 'pos', 'gateway', 'processor', 'stripe', 'paypal',
        'search', 'elastic', 'solr', 'lucene', 'sphinx', 'algolia', 'typesense', 'meilisearch',
        'chat', 'message', 'messaging', 'slack', 'discord', 'telegram', 'whatsapp', 'sms',
        'notification', 'notify', 'alert', 'webhook', 'event', 'queue', 'worker', 'job', 'cron',
        'scheduler', 'task', 'batch', 'pipeline', 'etl', 'data', 'analytics', 'metrics', 'stats',
        'report', 'reports', 'dashboard', 'viz', 'chart', 'graph', 'tableau', 'powerbi', 'looker'
    ]
    
    # Environment variations
    environments = [
        'local', 'localhost', 'dev', 'develop', 'development', 'test', 'testing', 'qa', 'uat',
        'stage', 'staging', 'preprod', 'prod', 'production', 'live', 'demo', 'sandbox', 'beta',
        'alpha', 'rc', 'canary', 'preview', 'internal', 'private', 'public', 'external'
    ]
    
    # Generate comprehensive wordlist
    wordlist = set()
    
    # Add base words
    for word_list in [base_words, tech_words, service_patterns, environments]:
        wordlist.update(word_list)
    
    # Add numbered variations (1-20 for performance)
    for word in base_words + tech_words[:30]:  # Limit to avoid explosion
        for i in range(1, 21):
            wordlist.add(f"{word}{i}")
            wordlist.add(f"{word}-{i}")
            wordlist.add(f"{word}_{i}")
    
    # Add environment combinations
    for env in ['dev', 'test', 'stage', 'prod', 'beta', 'demo']:
        for word in base_words[:50]:
            wordlist.add(f"{env}-{word}")
            wordlist.add(f"{env}{word}")
            wordlist.add(f"{word}-{env}")
    
    # Add common prefixes
    prefixes = ['www', 'web', 'mail', 'ftp', 'api', 'cdn', 'static', 'assets', 'secure', 'ssl']
    for prefix in prefixes:
        for word in base_words[:30]:
            if word != prefix:
                wordlist.add(f"{prefix}-{word}")
                wordlist.add(f"{prefix}{word}")
    
    # Add single letters and numbers
    for char in 'abcdefghijklmnopqrstuvwxyz':
        wordlist.add(char)
    for num in range(0, 100):
        wordlist.add(str(num))
    
    # Add common two-letter combinations
    common_combos = ['db', 'fs', 'ns', 'mx', 'lb', 'gw', 'fw', 'sw', 'hw', 'os', 'vm', 'dc', 'dr']
    wordlist.update(common_combos)
    
    return sorted(list(wordlist))

def check_dns_resolution(subdomain, domain):
    """Check if subdomain resolves via DNS"""
    try:
        full_domain = f"{subdomain}.{domain}"
        socket.gethostbyname(full_domain)
        return True
    except socket.gaierror:
        return False

def check_subdomain_advanced(subdomain, domain, timeout=8):
    """Advanced subdomain checking with multiple validation methods"""
    full_domain = f"{subdomain}.{domain}"
    
    # First check DNS resolution
    if not check_dns_resolution(subdomain, domain):
        return None
    
    protocols = ['https', 'http']
    
    headers = {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    }
    
    # Try HTTPS first, then HTTP
    for protocol in protocols:
        url = f"{protocol}://{full_domain}"
        
        try:
            session = requests.Session()
            session.headers.update(headers)
            
            response = session.get(
                url,
                timeout=timeout,
                allow_redirects=True,
                verify=False,
                stream=False
            )
            
            # Check for valid response
            if response.status_code in [200, 301, 302, 403, 401, 500]:
                return {
                    'subdomain': full_domain,
                    'url': url,
                    'status_code': response.status_code,
                    'content_length': len(response.content),
                    'title': extract_title_advanced(response.text),
                    'server': response.headers.get('Server', 'Unknown'),
                    'content_type': response.headers.get('Content-Type', 'Unknown'),
                    'response_time': response.elapsed.total_seconds(),
                    'final_url': response.url,
                    'ssl_info': get_ssl_info(full_domain) if protocol == 'https' else None
                }
                
        except requests.exceptions.RequestException:
            continue
    
    # Try alternative ports for HTTP services
    for port in [8080, 3000, 5000, 8000]:
        try:
            url = f"http://{full_domain}:{port}"
            response = requests.get(url, headers=headers, timeout=5, verify=False)
            
            if response.status_code in [200, 301, 302, 403, 401]:
                return {
                    'subdomain': f"{full_domain}:{port}",
                    'url': url,
                    'status_code': response.status_code,
                    'content_length': len(response.content),
                    'title': extract_title_advanced(response.text),
                    'server': response.headers.get('Server', 'Unknown'),
                    'content_type': response.headers.get('Content-Type', 'Unknown'),
                    'response_time': response.elapsed.total_seconds(),
                    'final_url': response.url,
                    'ssl_info': None
                }
        except:
            continue
    
    return None

def extract_title_advanced(html_content):
    """Enhanced title extraction with better parsing"""
    try:
        # Try multiple patterns for title extraction
        patterns = [
            r'<title[^>]*>([^<]+)</title>',
            r'<title[^>]*>\s*([^<]+?)\s*</title>',
            r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']',
            r'<meta[^>]*name=["\']title["\'][^>]*content=["\']([^"\']+)["\']'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, html_content, re.IGNORECASE | re.DOTALL)
            if match:
                title = match.group(1).strip()
                # Clean up the title
                title = re.sub(r'\s+', ' ', title)
                return title[:150] if title else "No title"
        
        return "No title"
    except Exception:
        return "No title"

def get_ssl_info(domain):
    """Get SSL certificate information"""
    try:
        context = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                return {
                    'issuer': dict(x[0] for x in cert.get('issuer', [])),
                    'subject': dict(x[0] for x in cert.get('subject', [])),
                    'version': cert.get('version'),
                    'not_after': cert.get('notAfter')
                }
    except Exception:
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scan', methods=['POST'])
def scan_subdomains():
    data = request.get_json()
    domain = data.get('domain', '').strip()
    max_threads = min(int(data.get('threads', 100)), 200)  # Increased max threads
    timeout = int(data.get('timeout', 8))
    
    if not domain:
        return jsonify({'error': 'Domain is required'}), 400
    
    # Clean domain
    domain = domain.replace('http://', '').replace('https://', '').split('/')[0]
    
    # Load massive wordlist
    wordlist = load_massive_wordlist()
    print(f"Loaded {len(wordlist)} subdomains for scanning")
    
    found_subdomains = []
    scanned_count = 0
    
    def scan_batch(subdomains_batch):
        batch_results = []
        for subdomain in subdomains_batch:
            result = check_subdomain_advanced(subdomain, domain, timeout)
            if result:
                batch_results.append(result)
                print(f"Found: {result['subdomain']}")
        return batch_results
    
    # Process in smaller batches for better performance
    batch_size = 20
    batches = [wordlist[i:i + batch_size] for i in range(0, len(wordlist), batch_size)]
    
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        future_to_batch = {executor.submit(scan_batch, batch): batch for batch in batches}
        
        for future in as_completed(future_to_batch):
            try:
                batch_results = future.result()
                found_subdomains.extend(batch_results)
                scanned_count += batch_size
            except Exception as e:
                print(f"Error processing batch: {e}")
    
    # Sort results by subdomain name
    found_subdomains.sort(key=lambda x: x['subdomain'])
    
    return jsonify({
        'domain': domain,
        'total_checked': len(wordlist),
        'found_count': len(found_subdomains),
        'subdomains': found_subdomains,
        'wordlist_size': len(wordlist)
    })

# Add cache busting for development
@app.after_request
def add_header(response):
    response.cache_control.no_cache = True
    response.cache_control.no_store = True
    response.cache_control.must_revalidate = True
    response.cache_control.max_age = 0
    return response

if __name__ == '__main__':
    app.run(debug=True, threaded=True, host='0.0.0.0', port=5000)
