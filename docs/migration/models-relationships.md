# MODELS E RELACIONAMENTOS LARAVEL

## Lista de Models
1. **User** - Usuários do sistema
2. **Plan** - Planos de assinatura
3. **Number** - Números/instâncias WhatsApp
4. **Campaign** - Campanhas de marketing
5. **Contact** - Contatos dos usuários
6. **Message** - Mensagens das campanhas
7. **Publics** - Públicos/grupos de contatos
8. **PublicByContact** - Relacionamento público-contato
9. **Payment** - Pagamentos e transações
10. **Server** - Servidores de infraestrutura
11. **Label** - Sistema de etiquetas
12. **Setting** - Configurações globais
13. **Configuration** - Configurações por usuário
14. **SimplifiedPublic** - Públicos simplificados
15. **CustomPublic** - Públicos personalizados
16. **BlockContact** - Contatos bloqueados
17. **MessageByContact** - Relacionamento mensagem-contato
18. **Log** - Logs do sistema
19. **Permission** - Permissões do sistema
20. **WebhooksLog** - Logs de webhooks

## Model: User (app/Models/User.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $table = 'users';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        "plan_id",
        "stripe_id", 
        "name",
        "last_name",
        "email",
        "cel",
        "cpfCnpj",
        "status",
        "profile",
        "photo",
        "password",
        "confirmed_mail",
        "email_verified_at",
        "email_code_verication",
        "active",
        "canceled_at",
        "due_access_at"
    ];
    
    protected $hidden = [
        'password',
        'remember_token',
        'email_code_verication'
    ];
    
    protected $casts = [
        'email_verified_at' => 'datetime',
        'canceled_at' => 'datetime',
        'due_access_at' => 'datetime',
        'active' => 'boolean',
        'confirmed_mail' => 'boolean'
    ];

    protected $dates = [
        'deleted_at',
        'email_verified_at',
        'canceled_at',
        'due_access_at'
    ];
}
```

### Relacionamentos
```php
// BelongsTo - Um usuário pertence a um plano
public function plan()
{
    return $this->belongsTo(Plan::class, 'plan_id');
}

// HasMany - Um usuário tem muitos números WhatsApp
public function numbers()
{
    return $this->hasMany(Number::class, 'user_id');
}

// HasMany - Um usuário tem muitas campanhas
public function campaigns()
{
    return $this->hasMany(Campaign::class, 'user_id');
}

// HasMany - Um usuário tem muitos contatos
public function contacts()
{
    return $this->hasMany(Contact::class, 'user_id');
}

// HasMany - Um usuário tem muitos públicos
public function publics()
{
    return $this->hasMany(Publics::class, 'user_id');
}

// HasMany - Um usuário tem muitos pagamentos
public function payments()
{
    return $this->hasMany(Payment::class, 'user_id');
}

// HasMany - Um usuário tem muitas labels
public function labels()
{
    return $this->hasMany(Label::class, 'user_id');
}

// HasOne - Um usuário tem uma configuração
public function configuration()
{
    return $this->hasOne(Configuration::class, 'user_id');
}

// HasMany - Um usuário tem muitos logs
public function logs()
{
    return $this->hasMany(Log::class, 'user_id');
}

// HasOne - Última campanha criada
public function latestCampaign()
{
    return $this->hasOne(Campaign::class, 'user_id')->latestOfMany();
}
```

### Mutators e Accessors
```php
// Mutator - Sempre hash a senha
public function setPasswordAttribute($value)
{
    if (!empty($value)) {
        $this->attributes['password'] = Hash::make($value);
    }
}

// Accessor - Nome completo
public function getFullNameAttribute()
{
    return trim($this->name . ' ' . $this->last_name);
}

// Accessor - Status formatado
public function getStatusFormattedAttribute()
{
    return $this->status === 'actived' ? 'Ativo' : 'Inativo';
}

// Accessor - Perfil formatado
public function getProfileFormattedAttribute()
{
    return $this->profile === 'administrator' ? 'Administrador' : 'Usuário';
}
```

### Scopes
```php
// Scope - Usuários ativos
public function scopeActive($query)
{
    return $query->where('status', 'actived')
                 ->where('active', 1)
                 ->whereNull('canceled_at');
}

// Scope - Usuários administradores
public function scopeAdministrators($query)
{
    return $query->where('profile', 'administrator');
}

// Scope - Usuários com plano ativo
public function scopeWithActivePlan($query)
{
    return $query->whereNotNull('plan_id')
                 ->whereNull('canceled_at')
                 ->where(function($q) {
                     $q->whereNull('due_access_at')
                       ->orWhere('due_access_at', '>', now());
                 });
}
```

---

## Model: Plan (app/Models/Plan.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Plan extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'plans';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        'code_mp',
        'name',
        'value',
        'value_promotion',
        'unlimited',
        'medias',
        'reports',
        'schedule',
        'popular',
        'code_product'
    ];
    
    protected $casts = [
        'value' => 'float',
        'value_promotion' => 'float',
        'unlimited' => 'boolean',
        'medias' => 'boolean',
        'reports' => 'boolean',
        'schedule' => 'boolean',
        'popular' => 'boolean'
    ];

    protected $dates = ['deleted_at'];
}
```

### Relacionamentos
```php
// HasMany - Um plano tem muitos usuários
public function users()
{
    return $this->hasMany(User::class, 'plan_id');
}

// HasMany - Um plano tem muitos pagamentos
public function payments()
{
    return $this->hasMany(Payment::class, 'plan_id');
}
```

### Accessors
```php
// Accessor - Preço efetivo (considera promoção)
public function getEffectivePriceAttribute()
{
    return $this->value_promotion > 0 ? $this->value_promotion : $this->value;
}

// Accessor - Preço formatado
public function getFormattedPriceAttribute()
{
    return 'R$ ' . number_format($this->effective_price, 2, ',', '.');
}

// Accessor - Recursos em array
public function getFeaturesAttribute()
{
    return [
        'unlimited' => $this->unlimited,
        'medias' => $this->medias,
        'reports' => $this->reports,
        'schedule' => $this->schedule
    ];
}
```

### Scopes
```php
// Scope - Planos ativos
public function scopeActive($query)
{
    return $query->whereNull('deleted_at');
}

// Scope - Planos populares
public function scopePopular($query)
{
    return $query->where('popular', true);
}

// Scope - Planos com promoção
public function scopeOnPromotion($query)
{
    return $query->where('value_promotion', '>', 0);
}
```

---

## Model: Number (app/Models/Number.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Number extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'numbers';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        'user_id',
        'server_id',
        'name',
        'instance',
        'status',
        'status_connection',
        'cel',
        'photo',
        'extra',
        'chat_sync',
        'qrcode',
        'qrcode_lastdate',
        'stripe_code',
        'canceled_at',
        'labels_active',
        'last_sync_date'
    ];
    
    protected $casts = [
        'status' => 'boolean',
        'status_connection' => 'boolean',
        'extra' => 'boolean',
        'chat_sync' => 'integer',
        'labels_active' => 'boolean',
        'qrcode_lastdate' => 'datetime',
        'canceled_at' => 'datetime',
        'last_sync_date' => 'datetime'
    ];

    protected $dates = [
        'deleted_at',
        'qrcode_lastdate',
        'canceled_at',
        'last_sync_date'
    ];
}
```

### Relacionamentos
```php
// BelongsTo - Um número pertence a um usuário
public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

// BelongsTo - Um número pertence a um servidor
public function server()
{
    return $this->belongsTo(Server::class, 'server_id');
}

// HasMany - Um número tem muitas campanhas
public function campaigns()
{
    return $this->hasMany(Campaign::class, 'number_id');
}

// HasMany - Um número tem muitas labels
public function labels()
{
    return $this->hasMany(Label::class, 'number_id');
}

// HasMany - Um número tem muitos contatos
public function contacts()
{
    return $this->hasMany(Contact::class, 'number_id');
}
```

### Accessors
```php
// Accessor - Status de conexão formatado
public function getConnectionStatusFormattedAttribute()
{
    return $this->status_connection ? 'Conectado' : 'Desconectado';
}

// Accessor - Tipo do número
public function getTypeFormattedAttribute()
{
    return $this->extra ? 'Número Extra' : 'Número Principal';
}

// Accessor - QR Code válido
public function getQrCodeValidAttribute()
{
    if (!$this->qrcode || !$this->qrcode_lastdate) {
        return false;
    }
    
    // QR Code válido por 2 minutos
    return $this->qrcode_lastdate->diffInMinutes(now()) <= 2;
}
```

### Scopes
```php
// Scope - Números ativos
public function scopeActive($query)
{
    return $query->where('status', 1)
                 ->whereNull('canceled_at');
}

// Scope - Números conectados
public function scopeConnected($query)
{
    return $query->where('status_connection', 1);
}

// Scope - Números extras
public function scopeExtra($query)
{
    return $query->where('extra', 1);
}

// Scope - Números principais
public function scopePrimary($query)
{
    return $query->where('extra', 0);
}

// Scope - Com labels ativas
public function scopeWithLabels($query)
{
    return $query->where('labels_active', 1);
}
```

---

## Model: Campaign (app/Models/Campaign.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campaign extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'campaigns';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        'public_id',
        'user_id',
        'number_id',
        'name',
        'type',
        'schedule_date',
        'total_interactions',
        'total_read',
        'total_delivered',
        'total_sent',
        'status',
        'date_finished',
        'date_end',
        'progress',
        'paused',
        'canceled',
        'processed_contacts',
        'labels',
        'total_contacts',
        'call'
    ];
    
    protected $casts = [
        'type' => 'integer',
        'schedule_date' => 'datetime',
        'total_interactions' => 'integer',
        'total_read' => 'integer',
        'total_delivered' => 'integer',
        'total_sent' => 'integer',
        'status' => 'integer',
        'date_finished' => 'datetime',
        'date_end' => 'datetime',
        'progress' => 'integer',
        'paused' => 'boolean',
        'canceled' => 'boolean',
        'processed_contacts' => 'integer',
        'labels' => 'array',
        'total_contacts' => 'integer',
        'call' => 'boolean'
    ];

    protected $dates = [
        'deleted_at',
        'schedule_date',
        'date_finished',
        'date_end'
    ];

    // Constantes de status
    const STATUS_PENDING = 0;
    const STATUS_RUNNING = 1;
    const STATUS_COMPLETED = 2;
    const STATUS_CANCELED = 3;

    // Constantes de tipo
    const TYPE_SIMPLIFIED = 1;
    const TYPE_MANUAL = 2;
}
```

### Relacionamentos
```php
// BelongsTo - Uma campanha pertence a um usuário
public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

// BelongsTo - Uma campanha pertence a um número
public function number()
{
    return $this->belongsTo(Number::class, 'number_id');
}

// BelongsTo - Uma campanha pode pertencer a um público
public function public()
{
    return $this->belongsTo(Publics::class, 'public_id');
}

// HasMany - Uma campanha tem muitas mensagens
public function messages()
{
    return $this->hasMany(Message::class, 'campaign_id');
}

// HasMany - Uma campanha tem muitos relacionamentos público-contato
public function publicByContacts()
{
    return $this->hasMany(PublicByContact::class, 'campaign_id');
}

// HasMany - Uma campanha tem muitos contatos bloqueados
public function blockedContacts()
{
    return $this->hasMany(BlockContact::class, 'campaign_id');
}
```

### Accessors
```php
// Accessor - Status formatado
public function getStatusFormattedAttribute()
{
    $statuses = [
        self::STATUS_PENDING => 'Pendente',
        self::STATUS_RUNNING => 'Executando',
        self::STATUS_COMPLETED => 'Finalizada',
        self::STATUS_CANCELED => 'Cancelada'
    ];
    
    return $statuses[$this->status] ?? 'Desconhecido';
}

// Accessor - Tipo formatado
public function getTypeFormattedAttribute()
{
    $types = [
        self::TYPE_SIMPLIFIED => 'Simplificada',
        self::TYPE_MANUAL => 'Manual'
    ];
    
    return $types[$this->type] ?? 'Desconhecido';
}

// Accessor - Taxa de sucesso
public function getSuccessRateAttribute()
{
    if ($this->total_sent == 0) {
        return 0;
    }
    
    return round(($this->total_delivered / $this->total_sent) * 100, 2);
}

// Accessor - Taxa de leitura
public function getReadRateAttribute()
{
    if ($this->total_delivered == 0) {
        return 0;
    }
    
    return round(($this->total_read / $this->total_delivered) * 100, 2);
}

// Accessor - Está agendada
public function getIsScheduledAttribute()
{
    return $this->schedule_date && $this->schedule_date->isFuture();
}

// Accessor - Está ativa
public function getIsActiveAttribute()
{
    return $this->status === self::STATUS_RUNNING && !$this->paused && !$this->canceled;
}
```

### Scopes
```php
// Scope - Campanhas ativas
public function scopeActive($query)
{
    return $query->where('status', self::STATUS_RUNNING)
                 ->where('paused', false)
                 ->where('canceled', false);
}

// Scope - Campanhas pendentes
public function scopePending($query)
{
    return $query->where('status', self::STATUS_PENDING)
                 ->where('canceled', false);
}

// Scope - Campanhas finalizadas
public function scopeCompleted($query)
{
    return $query->where('status', self::STATUS_COMPLETED);
}

// Scope - Campanhas canceladas
public function scopeCanceled($query)
{
    return $query->where('canceled', true);
}

// Scope - Campanhas agendadas
public function scopeScheduled($query)
{
    return $query->whereNotNull('schedule_date')
                 ->where('schedule_date', '>', now());
}

// Scope - Campanhas do usuário
public function scopeByUser($query, $userId)
{
    return $query->where('user_id', $userId);
}

// Scope - Campanhas por tipo
public function scopeByType($query, $type)
{
    return $query->where('type', $type);
}
```

### Mutators
```php
// Mutator - Garantir que labels seja array
public function setLabelsAttribute($value)
{
    if (is_string($value)) {
        $this->attributes['labels'] = json_encode(explode(',', $value));
    } elseif (is_array($value)) {
        $this->attributes['labels'] = json_encode($value);
    } else {
        $this->attributes['labels'] = json_encode([]);
    }
}
```

---

## Model: Contact (app/Models/Contact.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'contacts';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        'user_id',
        'public_id',
        'number_id',
        'name',
        'number',
        'cel_owner',
        'description',
        'variable_1',
        'variable_2',
        'variable_3',
        'type',
        'status',
        'labels',
        'labelsName'
    ];
    
    protected $casts = [
        'type' => 'integer',
        'status' => 'integer',
        'labels' => 'array'
    ];

    protected $dates = ['deleted_at'];

    // Constantes de tipo
    const TYPE_CONVERSATION = 1;
    const TYPE_UPLOAD = 2;
}
```

### Relacionamentos
```php
// BelongsTo - Um contato pertence a um usuário
public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

// BelongsTo - Um contato pode pertencer a um público
public function public()
{
    return $this->belongsTo(Publics::class, 'public_id');
}

// BelongsTo - Um contato pode pertencer a um número
public function number()
{
    return $this->belongsTo(Number::class, 'number_id');
}

// HasMany - Um contato tem muitos relacionamentos com públicos
public function publicByContacts()
{
    return $this->hasMany(PublicByContact::class, 'contact_id');
}

// HasMany - Um contato tem muitos relacionamentos com mensagens
public function messageByContacts()
{
    return $this->hasMany(MessageByContact::class, 'contact_id');
}

// HasMany - Um contato pode estar bloqueado em várias campanhas
public function blockedInCampaigns()
{
    return $this->hasMany(BlockContact::class, 'contact_id');
}
```

### Mutators
```php
// Mutator - Formatar número do proprietário
public function setCelOwnerAttribute($value)
{
    if (!empty($value)) {
        $this->attributes['cel_owner'] = \App\Helpers\NumberHelper::formatNumberStatic($value);
    }
}

// Mutator - Formatar número do contato
public function setNumberAttribute($value)
{
    if (!empty($value)) {
        $this->attributes['number'] = \App\Helpers\PhoneNumberFormatter::format($value);
    }
}

// Mutator - Garantir que labels seja array
public function setLabelsAttribute($value)
{
    if (is_string($value)) {
        $this->attributes['labels'] = json_encode(explode(',', $value));
    } elseif (is_array($value)) {
        $this->attributes['labels'] = json_encode($value);
    } else {
        $this->attributes['labels'] = json_encode([]);
    }
}
```

### Accessors
```php
// Accessor - Tipo formatado
public function getTypeFormattedAttribute()
{
    $types = [
        self::TYPE_CONVERSATION => 'Conversa',
        self::TYPE_UPLOAD => 'Upload'
    ];
    
    return $types[$this->type] ?? 'Desconhecido';
}

// Accessor - Nome ou número
public function getDisplayNameAttribute()
{
    return $this->name ?: $this->number;
}

// Accessor - Labels como array
public function getLabelsArrayAttribute()
{
    return is_array($this->labels) ? $this->labels : [];
}
```

### Scopes
```php
// Scope - Contatos ativos
public function scopeActive($query)
{
    return $query->where('status', 1);
}

// Scope - Contatos por tipo
public function scopeByType($query, $type)
{
    return $query->where('type', $type);
}

// Scope - Contatos de conversas
public function scopeFromConversations($query)
{
    return $query->where('type', self::TYPE_CONVERSATION);
}

// Scope - Contatos de upload
public function scopeFromUpload($query)
{
    return $query->where('type', self::TYPE_UPLOAD);
}

// Scope - Buscar por termo
public function scopeSearch($query, $term)
{
    return $query->where(function($q) use ($term) {
        $q->where('name', 'LIKE', "%{$term}%")
          ->orWhere('number', 'LIKE', "%{$term}%")
          ->orWhere('description', 'LIKE', "%{$term}%");
    });
}

// Scope - Com labels específicas
public function scopeWithLabels($query, $labels)
{
    if (is_string($labels)) {
        $labels = [$labels];
    }
    
    return $query->where(function($q) use ($labels) {
        foreach ($labels as $label) {
            $q->orWhereJsonContains('labels', $label);
        }
    });
}
```

---

## Model: Message (app/Models/Message.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'messages';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        'user_id',
        'campaign_id',
        'type',
        'message',
        'order',
        'media',
        'media_type'
    ];
    
    protected $casts = [
        'type' => 'integer',
        'order' => 'integer',
        'media_type' => 'integer'
    ];

    protected $dates = ['deleted_at'];

    // Constantes de tipo de mídia
    const MEDIA_AUDIO = 1;
    const MEDIA_VIDEO = 2;
    const MEDIA_IMAGE = 3;
}
```

### Relacionamentos
```php
// BelongsTo - Uma mensagem pertence a um usuário
public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

// BelongsTo - Uma mensagem pertence a uma campanha
public function campaign()
{
    return $this->belongsTo(Campaign::class, 'campaign_id');
}

// HasMany - Uma mensagem tem muitos relacionamentos com contatos
public function messageByContacts()
{
    return $this->hasMany(MessageByContact::class, 'message_id');
}
```

### Accessors
```php
// Accessor - Tipo de mídia formatado
public function getMediaTypeFormattedAttribute()
{
    $types = [
        self::MEDIA_AUDIO => 'Áudio',
        self::MEDIA_VIDEO => 'Vídeo',
        self::MEDIA_IMAGE => 'Imagem'
    ];
    
    return $types[$this->media_type] ?? null;
}

// Accessor - Tem mídia
public function getHasMediaAttribute()
{
    return !empty($this->media);
}

// Accessor - URL completa da mídia
public function getMediaUrlAttribute()
{
    if (!$this->media) {
        return null;
    }
    
    // Se já é uma URL completa, retorna como está
    if (str_starts_with($this->media, 'http')) {
        return $this->media;
    }
    
    // Caso contrário, constrói a URL
    return asset('storage/' . $this->media);
}
```

### Scopes
```php
// Scope - Mensagens com mídia
public function scopeWithMedia($query)
{
    return $query->whereNotNull('media');
}

// Scope - Mensagens por tipo de mídia
public function scopeByMediaType($query, $type)
{
    return $query->where('media_type', $type);
}

// Scope - Mensagens ordenadas
public function scopeOrdered($query)
{
    return $query->orderBy('order', 'asc');
}

// Scope - Mensagens da campanha
public function scopeByCampaign($query, $campaignId)
{
    return $query->where('campaign_id', $campaignId);
}
```

---

## Model: Publics (app/Models/Publics.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Publics extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'publics';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        'user_id',
        'number_id',
        'name',
        'photo',
        'status',
        'from_chat',
        'from_tag',
        'number',
        'labels'
    ];
    
    protected $casts = [
        'status' => 'integer',
        'from_chat' => 'boolean',
        'from_tag' => 'boolean',
        'labels' => 'array'
    ];

    protected $dates = ['deleted_at'];
}
```

### Relacionamentos
```php
// BelongsTo - Um público pertence a um usuário
public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

// BelongsTo - Um público pode pertencer a um número
public function number()
{
    return $this->belongsTo(Number::class, 'number_id');
}

// HasMany - Um público tem muitas campanhas
public function campaigns()
{
    return $this->hasMany(Campaign::class, 'public_id');
}

// HasMany - Um público tem muitos contatos
public function contacts()
{
    return $this->hasMany(Contact::class, 'public_id');
}

// HasMany - Um público tem muitos relacionamentos com contatos
public function publicByContacts()
{
    return $this->hasMany(PublicByContact::class, 'public_id');
}
```

### Accessors
```php
// Accessor - Total de contatos
public function getTotalContactsAttribute()
{
    return $this->contacts()->count();
}

// Accessor - Contatos ativos
public function getActiveContactsAttribute()
{
    return $this->contacts()->active()->count();
}

// Accessor - Origem formatada
public function getOriginFormattedAttribute()
{
    if ($this->from_chat) {
        return 'Chat';
    } elseif ($this->from_tag) {
        return 'Tag/Label';
    } else {
        return 'Manual';
    }
}
```

### Scopes
```php
// Scope - Públicos ativos
public function scopeActive($query)
{
    return $query->where('status', 1);
}

// Scope - Públicos do chat
public function scopeFromChat($query)
{
    return $query->where('from_chat', true);
}

// Scope - Públicos de tags
public function scopeFromTags($query)
{
    return $query->where('from_tag', true);
}

// Scope - Públicos manuais
public function scopeManual($query)
{
    return $query->where('from_chat', false)
                 ->where('from_tag', false);
}
```

---

## Model: Payment (app/Models/Payment.php)

### Configurações Base
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'payments';
    protected $primaryKey = 'id';
    public $timestamps = true;
    
    protected $fillable = [
        'user_id',
        'plan_id',
        'number_id',
        'status',
        'payment_id',
        'from',
        'amount',
        'extra_number'
    ];
    
    protected $casts = [
        'amount' => 'float'
    ];

    protected $dates = ['deleted_at'];

    // Constantes de status
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_CANCELED = 'canceled';

    // Constantes de gateway
    const GATEWAY_STRIPE = 'stripe';
    const GATEWAY_MERCADOPAGO = 'mercadopago';
}
```

### Relacionamentos
```php
// BelongsTo - Um pagamento pertence a um usuário
public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

// BelongsTo - Um pagamento é de um plano
public function plan()
{
    return $this->belongsTo(Plan::class, 'plan_id');
}

// BelongsTo - Um pagamento pode ser de um número extra
public function number()
{
    return $this->belongsTo(Number::class, 'number_id');
}
```

### Accessors
```php
// Accessor - Status formatado
public function getStatusFormattedAttribute()
{
    $statuses = [
        self::STATUS_PENDING => 'Pendente',
        self::STATUS_APPROVED => 'Aprovado',
        self::STATUS_REJECTED => 'Rejeitado',
        self::STATUS_CANCELED => 'Cancelado'
    ];
    
    return $statuses[$this->status] ?? 'Desconhecido';
}

// Accessor - Gateway formatado
public function getGatewayFormattedAttribute()
{
    $gateways = [
        self::GATEWAY_STRIPE => 'Stripe',
        self::GATEWAY_MERCADOPAGO => 'MercadoPago'
    ];
    
    return $gateways[$this->from] ?? 'Desconhecido';
}

// Accessor - Valor formatado
public function getFormattedAmountAttribute()
{
    return 'R$ ' . number_format($this->amount, 2, ',', '.');
}
```

### Scopes
```php
// Scope - Pagamentos aprovados
public function scopeApproved($query)
{
    return $query->where('status', self::STATUS_APPROVED);
}

// Scope - Pagamentos pendentes
public function scopePending($query)
{
    return $query->where('status', self::STATUS_PENDING);
}

// Scope - Por gateway
public function scopeByGateway($query, $gateway)
{
    return $query->where('from', $gateway);
}

// Scope - Pagamentos de números extras
public function scopeExtraNumbers($query)
{
    return $query->whereNotNull('number_id');
}
```

---

## Resumo dos Relacionamentos

### Relacionamentos 1:N (One-to-Many)
- **User → Numbers**: hasMany(Number::class, 'user_id')
- **User → Campaigns**: hasMany(Campaign::class, 'user_id')
- **User → Contacts**: hasMany(Contact::class, 'user_id')
- **User → Payments**: hasMany(Payment::class, 'user_id')
- **User → Publics**: hasMany(Publics::class, 'user_id')
- **User → Labels**: hasMany(Label::class, 'user_id')
- **Plan → Users**: hasMany(User::class, 'plan_id')
- **Plan → Payments**: hasMany(Payment::class, 'plan_id')
- **Number → Campaigns**: hasMany(Campaign::class, 'number_id')
- **Number → Labels**: hasMany(Label::class, 'number_id')
- **Campaign → Messages**: hasMany(Message::class, 'campaign_id')
- **Server → Numbers**: hasMany(Number::class, 'server_id')
- **Publics → Campaigns**: hasMany(Campaign::class, 'public_id')
- **Publics → Contacts**: hasMany(Contact::class, 'public_id')

### Relacionamentos N:1 (Many-to-One / BelongsTo)
- **User → Plan**: belongsTo(Plan::class, 'plan_id')
- **Number → User**: belongsTo(User::class, 'user_id')
- **Number → Server**: belongsTo(Server::class, 'server_id')
- **Campaign → User**: belongsTo(User::class, 'user_id')
- **Campaign → Number**: belongsTo(Number::class, 'number_id')
- **Campaign → Publics**: belongsTo(Publics::class, 'public_id')
- **Contact → User**: belongsTo(User::class, 'user_id')
- **Contact → Publics**: belongsTo(Publics::class, 'public_id')
- **Message → Campaign**: belongsTo(Campaign::class, 'campaign_id')
- **Payment → User**: belongsTo(User::class, 'user_id')
- **Payment → Plan**: belongsTo(Plan::class, 'plan_id')

### Relacionamentos N:M (Many-to-Many via pivot)
- **Publics ↔ Contacts**: via PublicByContact
- **Messages ↔ Contacts**: via MessageByContact
- **Contacts ↔ Campaigns**: via BlockContact

### Relacionamentos 1:1 (One-to-One)
- **User → Configuration**: hasOne(Configuration::class, 'user_id')

## Traits Utilizados

### Por Todas as Models
- **HasFactory**: Para factories de teste
- **SoftDeletes**: Para exclusão lógica (18 models)

### Models Específicos
- **User**: HasApiTokens, Notifiable (Authenticatable)
- **Number**: Nenhum trait adicional
- **Campaign**: Nenhum trait adicional

## Configurações Importantes

### Fillable Protection
Todas as models têm arrays $fillable específicos para mass assignment protection.

### Hidden Attributes
- **User**: ['password', 'remember_token', 'email_code_verication']

### Casts
- **Dates**: Automaticamente para datetime
- **Booleans**: Para flags 0/1
- **Arrays**: Para campos JSON (labels, configurations)
- **Floats**: Para valores monetários

### Validações nos Models
- **Contact**: Formatação automática de números via mutators
- **User**: Hash automático de senha via mutator
- **Campaign/Contact**: Conversão automática de labels para JSON

Esta documentação fornece todos os detalhes necessários para recriar os models Laravel como entidades TypeORM no NestJS, preservando todas as relações, configurações e comportamentos.