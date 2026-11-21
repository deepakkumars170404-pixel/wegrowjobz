package com.wegrow.telecaller

import android.app.role.RoleManager
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.telecom.TelecomManager
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File

class WegrowTelephonyModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), WegrowInCallService.Companion.CallStateListener {

    companion object {
        private const val TAG = "WegrowTelephony"
    }

    init {
        WegrowInCallService.listener = this
    }

    override fun getName(): String = "WegrowTelephony"

    override fun onCallStateUpdate(
        state: String,
        rawState: Int,
        phoneNumber: String,
        contactName: String,
        isIncoming: Boolean,
        durationSeconds: Int,
        activeTimeMs: Long,
        isSpeaker: Boolean,
        isMuted: Boolean,
        hasHeldCall: Boolean,
        heldPhoneNumber: String,
        heldContactName: String,
        isConference: Boolean
    ) {
        try {
            val params = Arguments.createMap().apply {
                putString("state", state)
                putInt("rawState", rawState)
                putString("phoneNumber", phoneNumber)
                putString("contactName", contactName)
                putBoolean("isIncoming", isIncoming)
                putInt("durationSeconds", durationSeconds)
                putDouble("activeTimeMs", activeTimeMs.toDouble())
                putBoolean("isAttended", activeTimeMs > 0L)
                putBoolean("isSpeaker", isSpeaker)
                putBoolean("isMuted", isMuted)
                putBoolean("hasHeldCall", hasHeldCall)
                putString("heldPhoneNumber", heldPhoneNumber)
                putString("heldContactName", heldContactName)
                putBoolean("isConference", isConference)
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onCallStateChanged", params)
        } catch (e: Exception) {}
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native NativeEventEmitter
    }

    @ReactMethod
    fun getCurrentCallState(promise: Promise) {
        try {
            val state = WegrowInCallService.currentState
            val activeTime = WegrowInCallService.callActiveTimeMs
            val durSecs = if (activeTime > 0) {
                if (state == "DISCONNECTED") {
                    Math.max(0, ((WegrowInCallService.callEndTimeMs - activeTime) / 1000).toInt())
                } else {
                    Math.max(0, ((System.currentTimeMillis() - activeTime) / 1000).toInt())
                }
            } else 0

            val map = Arguments.createMap().apply {
                putString("state", state)
                putString("phoneNumber", WegrowInCallService.currentPhoneNumber)
                putString("contactName", WegrowInCallService.contactName)
                putBoolean("isIncoming", WegrowInCallService.isIncomingCall)
                putInt("durationSeconds", durSecs)
                putDouble("activeTimeMs", activeTime.toDouble())
                putBoolean("isAttended", activeTime > 0L)
                putBoolean("isSpeaker", WegrowInCallService.isSpeakerOn)
                putBoolean("isMuted", WegrowInCallService.isMuted)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("CALL_STATE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun directPhoneCall(phoneNumber: String, promise: Promise) {
        try {
            val cleanDigits = phoneNumber.replace(Regex("[^0-9+]"), "")
            if (cleanDigits.contains("9952337331")) {
                promise.reject("BLOCKED", "Calling 9952337331 is permanently blocked")
                return
            }
            if (cleanDigits.isEmpty()) {
                promise.reject("INVALID_NUMBER", "Phone number is empty")
                return
            }

            val callUri = Uri.parse("tel:$cleanDigits")
            // Single-click direct cellular call via Intent.ACTION_CALL
            // Directly initiates the call through Google Dialer without telecaller having to tap call again!
            val callIntent = Intent(Intent.ACTION_CALL).apply {
                data = callUri
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.CALL_PHONE
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                reactContext.startActivity(callIntent)
                promise.resolve(true)
            } else {
                val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                    data = callUri
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(dialIntent)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "directPhoneCall error: ${e.message}", e)
            try {
                val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                    data = Uri.parse("tel:${phoneNumber.replace(Regex("[^0-9+]"), "")}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(dialIntent)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("CALL_FAILED", err.message)
            }
        }
    }

    @ReactMethod
    fun directCall(phoneNumber: String, promise: Promise) {
        try {
            val cleanDigits = phoneNumber.replace(Regex("[^0-9+]"), "")
            if (cleanDigits.contains("9952337331")) {
                promise.reject("BLOCKED", "Calling 9952337331 is permanently blocked")
                return
            }

            WegrowInCallService.currentPhoneNumber = cleanDigits
            WegrowInCallService.isIncomingCall = false
            WegrowInCallService.contactName = WegrowInCallService.resolveContactName(reactContext, cleanDigits)
            WegrowInCallService.callDialStartTimeMs = System.currentTimeMillis()
            WegrowInCallService.callActiveTimeMs = 0L
            WegrowInCallService.callEndTimeMs = 0L
            WegrowInCallService.notifyUpdate("DIALING", 1)

            // PRIORITY 1: Use TelecomManager.placeCall (the native way for InCallService to place calls without UI collisions)
            val telecomManager = reactContext.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            val callUri = Uri.fromParts("tel", cleanDigits, null)
            val extras = Bundle().apply {
                putBoolean(TelecomManager.EXTRA_START_CALL_WITH_SPEAKERPHONE, false)
            }

            var placed = false
            if (telecomManager != null &&
                androidx.core.content.ContextCompat.checkSelfPermission(reactContext, android.Manifest.permission.CALL_PHONE) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                try {
                    telecomManager.placeCall(callUri, extras)
                    placed = true
                } catch (e: Exception) {
                    Log.w(TAG, "telecomManager.placeCall fallback to ACTION_CALL: ${e.message}")
                }
            }

            if (!placed) {
                val intent = Intent(Intent.ACTION_CALL).apply {
                    data = callUri
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            }

            // Re-assert Wegrow Telecaller to foreground so dialer UI is immediately visible
            val bringBackIntent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("call_action", "ACTIVE_CALL")
                putExtra("phone_number", cleanDigits)
                putExtra("contact_name", WegrowInCallService.contactName)
            }
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    reactContext.startActivity(bringBackIntent)
                } catch (e: Exception) {}
            }, 500)

            promise.resolve(true)
        } catch (e: Exception) {
            // Fallback to ACTION_DIAL if ACTION_CALL encounters any issue
            try {
                val cleanDigits = phoneNumber.replace(Regex("[^0-9+]"), "")
                val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                    data = Uri.parse("tel:$cleanDigits")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(dialIntent)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("CALL_FAILED", err.message)
            }
        }
    }

    @ReactMethod
    fun answerCall(promise: Promise) {
        try {
            val success = WegrowInCallService.answerCurrentCall()
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ANSWER_FAILED", e.message)
        }
    }

    @ReactMethod
    fun endCall(promise: Promise) {
        try {
            val disconnected = WegrowInCallService.disconnectCurrentCall()
            if (disconnected) {
                promise.resolve(true)
                return
            }
            val telecomManager = reactContext.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val ended = telecomManager?.endCall() ?: false
                promise.resolve(ended)
                return
            }
            Runtime.getRuntime().exec("input keyevent 6") // KEYCODE_ENDCALL
            promise.resolve(true)
        } catch (e: Exception) {
            try {
                Runtime.getRuntime().exec("input keyevent 6")
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("END_CALL_FAILED", e.message)
            }
        }
    }

    @ReactMethod
    fun setSpeaker(enabled: Boolean, promise: Promise) {
        try {
            val res = WegrowInCallService.setSpeakerRoute(enabled)
            promise.resolve(res)
        } catch (e: Exception) {
            promise.reject("SPEAKER_FAILED", e.message)
        }
    }

    @ReactMethod
    fun setMute(enabled: Boolean, promise: Promise) {
        try {
            val res = WegrowInCallService.setMuteState(enabled)
            promise.resolve(res)
        } catch (e: Exception) {
            promise.reject("MUTE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun sendDtmf(digit: String, promise: Promise) {
        try {
            if (digit.isNotEmpty()) {
                val res = WegrowInCallService.playDtmfTone(digit[0])
                promise.resolve(res)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("DTMF_FAILED", e.message)
        }
    }

    @ReactMethod
    fun holdCall(promise: Promise) {
        try {
            val res = WegrowInCallService.holdCurrentCall()
            promise.resolve(res)
        } catch (e: Exception) {
            promise.reject("HOLD_FAILED", e.message)
        }
    }

    @ReactMethod
    fun unholdCall(promise: Promise) {
        try {
            val res = WegrowInCallService.unholdCurrentCall()
            promise.resolve(res)
        } catch (e: Exception) {
            promise.reject("UNHOLD_FAILED", e.message)
        }
    }

    @ReactMethod
    fun mergeCalls(promise: Promise) {
        try {
            val res = WegrowInCallService.mergeConference()
            promise.resolve(res)
        } catch (e: Exception) {
            promise.reject("MERGE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun swapCalls(promise: Promise) {
        try {
            val res = WegrowInCallService.swapCalls()
            promise.resolve(res)
        } catch (e: Exception) {
            promise.reject("SWAP_FAILED", e.message)
        }
    }

    @ReactMethod
    fun getContactName(phoneNumber: String, promise: Promise) {
        try {
            val name = WegrowInCallService.resolveContactName(reactContext, phoneNumber)
            promise.resolve(name)
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun isDefaultDialer(promise: Promise) {
        try {
            val telecomManager = reactContext.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            val defaultDialer = telecomManager?.defaultDialerPackage
            val isDefault = defaultDialer == reactContext.packageName
            promise.resolve(isDefault)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestDefaultDialer(promise: Promise) {
        try {
            val currentActivity = reactContext.currentActivity
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = reactContext.getSystemService(RoleManager::class.java)
                if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                    val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                    if (currentActivity != null) {
                        currentActivity.startActivityForResult(intent, 1001)
                        promise.resolve("PROMPT_SHOWN")
                        return
                    } else {
                        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        reactContext.startActivity(intent)
                        promise.resolve("PROMPT_SHOWN")
                        return
                    }
                }
            }

            // Fallback 1: Open Default Apps Settings directly
            val intent = Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve("SETTINGS_OPENED")
        } catch (e: Exception) {
            try {
                // Fallback 2: Open App Info Settings
                val appInfoIntent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:" + reactContext.packageName)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(appInfoIntent)
                promise.resolve("APP_SETTINGS_OPENED")
            } catch (err: Exception) {
                promise.reject("ROLE_REQUEST_FAILED", err.message)
            }
        }
    }

    @ReactMethod
    fun getLastCallLog(phoneNumber: String?, promise: Promise) {
        try {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.READ_CALL_LOG
                ) != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                promise.resolve(null)
                return
            }

            val uri = android.provider.CallLog.Calls.CONTENT_URI
            val projection = arrayOf(
                android.provider.CallLog.Calls.NUMBER,
                android.provider.CallLog.Calls.DURATION,
                android.provider.CallLog.Calls.DATE,
                android.provider.CallLog.Calls.TYPE
            )

            val cursor = reactContext.contentResolver.query(
                uri,
                projection,
                null,
                null,
                "${android.provider.CallLog.Calls.DATE} DESC"
            )

            cursor?.use {
                val numIdx = it.getColumnIndex(android.provider.CallLog.Calls.NUMBER)
                val durIdx = it.getColumnIndex(android.provider.CallLog.Calls.DURATION)
                val dateIdx = it.getColumnIndex(android.provider.CallLog.Calls.DATE)
                val typeIdx = it.getColumnIndex(android.provider.CallLog.Calls.TYPE)

                val cleanTarget = (phoneNumber ?: "").filter { c -> c.isDigit() }.takeLast(7)

                // Check up to top 5 recent call logs to find match for dialed number
                var count = 0
                while (it.moveToNext() && count < 5) {
                    count++
                    val rawNum = if (numIdx != -1) it.getString(numIdx) ?: "" else ""
                    val cleanNum = rawNum.filter { c -> c.isDigit() }.takeLast(7)

                    if (cleanTarget.isEmpty() || cleanNum == cleanTarget || (cleanTarget.length >= 7 && (cleanNum.endsWith(cleanTarget) || cleanTarget.endsWith(cleanNum)))) {
                        val durationSecs = if (durIdx != -1) it.getInt(durIdx) else 0
                        val timestamp = if (dateIdx != -1) it.getLong(dateIdx) else 0L
                        val callType = if (typeIdx != -1) it.getInt(typeIdx) else 0

                        val map = Arguments.createMap().apply {
                            putString("number", rawNum)
                            putInt("durationSeconds", durationSecs)
                            putDouble("timestamp", timestamp.toDouble())
                            putInt("callType", callType)
                        }
                        promise.resolve(map)
                        return
                    }
                }

                // If not matched by number, fallback to very latest call log
                if (it.moveToFirst()) {
                    val rawNum = if (numIdx != -1) it.getString(numIdx) ?: "" else ""
                    val durationSecs = if (durIdx != -1) it.getInt(durIdx) else 0
                    val timestamp = if (dateIdx != -1) it.getLong(dateIdx) else 0L
                    val callType = if (typeIdx != -1) it.getInt(typeIdx) else 0

                    val map = Arguments.createMap().apply {
                        putString("number", rawNum)
                        putInt("durationSeconds", durationSecs)
                        putDouble("timestamp", timestamp.toDouble())
                        putInt("callType", callType)
                    }
                    promise.resolve(map)
                    return
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getAppVersionInfo(promise: Promise) {
        try {
            val pInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
            val map = Arguments.createMap().apply {
                putDouble("versionCode", versionCode.toDouble())
                putString("versionName", pInfo.versionName ?: "1.0.0")
                putString("packageName", reactContext.packageName)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("VERSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun downloadAndInstallApk(apkUrl: String, promise: Promise) {
        try {
            val fileName = "WegrowTelecaller_Update_${System.currentTimeMillis()}.apk"
            val downloadsDir = reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            
            // Clean up old update APKs
            downloadsDir?.listFiles()?.forEach { file ->
                if (file.name.startsWith("WegrowTelecaller_Update") && file.name.endsWith(".apk")) {
                    file.delete()
                }
            }

            val destinationFile = File(downloadsDir, fileName)

            val request = DownloadManager.Request(Uri.parse(apkUrl)).apply {
                setTitle("WeGrow Telecaller Update")
                setDescription("Downloading latest update...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationUri(Uri.fromFile(destinationFile))
                setMimeType("application/vnd.android.package-archive")
            }

            val downloadManager = reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = downloadManager.enqueue(request)

            val onComplete = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    try {
                        reactContext.unregisterReceiver(this)
                    } catch (_: Exception) {}

                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) ?: -1
                    if (id == downloadId && destinationFile.exists()) {
                        triggerApkInstall(destinationFile)
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(
                    onComplete,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                    Context.RECEIVER_NOT_EXPORTED
                )
            } else {
                reactContext.registerReceiver(
                    onComplete,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
                )
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error in downloadAndInstallApk: ${e.message}", e)
            promise.reject("DOWNLOAD_ERROR", e.message)
        }
    }

    private fun triggerApkInstall(file: File) {
        try {
            val context = reactContext
            val contentUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.provider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error launching package installer: ${e.message}", e)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CALL RECORDING FINDER — Locates the latest recording saved by System Phone
    // Works with: Xiaomi, Samsung, Realme, Oppo, Vivo, OnePlus built-in auto-recorders
    // ─────────────────────────────────────────────────────────────────────────
    @ReactMethod
    fun getLatestCallRecording(afterTimestampMs: Double, promise: Promise) {
        try {
            val afterMs = afterTimestampMs.toLong()

            // All known recording folder paths across different Android manufacturers
            val searchDirs = mutableListOf<File>()

            // 1. Standard MediaStore query first (most reliable across Android 10+)
            val mediaStoreFile = findViaMediaStore(afterMs)
            if (mediaStoreFile != null) {
                promise.resolve(mediaStoreFile)
                return
            }

            // 2. Manufacturer-specific folders
            val externalStorage = Environment.getExternalStorageDirectory()
            val candidates = listOf(
                // Xiaomi / MIUI
                File(externalStorage, "MIUI/sound_recorder/call_rec"),
                File(externalStorage, "Recordings/Call"),
                File(externalStorage, "recordings/call"),
                // Samsung
                File(externalStorage, "Call"),
                File(externalStorage, "PhoneRecord"),
                // Realme / Oppo / ColorOS
                File(externalStorage, "ColorOS/PhoneRecord"),
                File(externalStorage, "ColorOS/Recording/CallRecord"),
                File(externalStorage, "Recorder/PhoneRecord"),
                // Vivo / FuntouchOS
                File(externalStorage, "Record/PhoneRecord"),
                File(externalStorage, "BBKRecorder/PhoneRecord"),
                // OnePlus / OxygenOS
                File(externalStorage, "CallRecordings"),
                File(externalStorage, "OnePlus/CallRecordings"),
                // Generic
                File(externalStorage, "PhoneRecordings"),
                File(externalStorage, "CallRecord"),
                File(externalStorage, "Sounds"),
                // App-specific internal storage
                File(reactContext.getExternalFilesDir(null), "CallRecordings"),
                File(reactContext.filesDir, "CallRecordings")
            )

            var latestFile: File? = null
            var latestModified = afterMs

            for (dir in candidates) {
                if (!dir.exists() || !dir.isDirectory) continue
                try {
                    dir.listFiles()?.forEach { f ->
                        val ext = f.extension.lowercase()
                        if ((ext == "mp3" || ext == "m4a" || ext == "aac" || ext == "amr" || ext == "wav" || ext == "3gp") &&
                            f.lastModified() > latestModified
                        ) {
                            latestModified = f.lastModified()
                            latestFile = f
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Cannot read dir ${dir.absolutePath}: ${e.message}")
                }
            }

            if (latestFile != null) {
                val map = Arguments.createMap().apply {
                    putString("path", latestFile!!.absolutePath)
                    putString("name", latestFile!!.name)
                    putDouble("size", latestFile!!.length().toDouble())
                    putDouble("lastModified", latestFile!!.lastModified().toDouble())
                }
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "getLatestCallRecording error: ${e.message}", e)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun shareReportFile(csvContent: String, fileName: String, title: String, promise: Promise) {
        try {
            val cacheDir = reactContext.cacheDir
            val reportsDir = File(cacheDir, "reports")
            if (!reportsDir.exists()) reportsDir.mkdirs()

            val file = File(reportsDir, fileName)
            file.writeText(csvContent, Charsets.UTF_8)

            val uri = androidx.core.content.FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.provider",
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/csv"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, title)
                flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK
            }

            val chooser = Intent.createChooser(shareIntent, title).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "shareReportFile error: ${e.message}", e)
            promise.reject("SHARE_ERROR", e.message)
        }
    }

    private fun findViaMediaStore(afterMs: Long): com.facebook.react.bridge.WritableMap? {
        return try {
            val uri = android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            val projection = arrayOf(
                android.provider.MediaStore.Audio.Media.DATA,
                android.provider.MediaStore.Audio.Media.DISPLAY_NAME,
                android.provider.MediaStore.Audio.Media.SIZE,
                android.provider.MediaStore.Audio.Media.DATE_MODIFIED
            )
            // Look for audio files modified after the call started
            val afterSecs = afterMs / 1000
            val selection = "${android.provider.MediaStore.Audio.Media.DATE_MODIFIED} > ?"
            val selectionArgs = arrayOf(afterSecs.toString())
            val sortOrder = "${android.provider.MediaStore.Audio.Media.DATE_MODIFIED} DESC"

            var resultMap: com.facebook.react.bridge.WritableMap? = null

            reactContext.contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val pathIdx = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DATA)
                    val nameIdx = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DISPLAY_NAME)
                    val sizeIdx = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.SIZE)
                    val dateIdx = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DATE_MODIFIED)

                    val path = if (pathIdx != -1) cursor.getString(pathIdx) ?: "" else ""
                    val name = if (nameIdx != -1) cursor.getString(nameIdx) ?: "" else path.substringAfterLast("/")

                    // Heuristic: file name usually contains "call", "record", "phone" etc.
                    val lowerName = name.lowercase()
                    val isLikelyCallRecording = lowerName.contains("call") ||
                        lowerName.contains("record") ||
                        lowerName.contains("phone") ||
                        lowerName.contains("rec_") ||
                        path.lowercase().contains("call") ||
                        path.lowercase().contains("record")

                    if (path.isNotEmpty() && isLikelyCallRecording) {
                        val size = if (sizeIdx != -1) cursor.getLong(sizeIdx) else 0L
                        val dateModified = if (dateIdx != -1) cursor.getLong(dateIdx) * 1000L else 0L

                        resultMap = Arguments.createMap().apply {
                            putString("path", path)
                            putString("name", name)
                            putDouble("size", size.toDouble())
                            putDouble("lastModified", dateModified.toDouble())
                        }
                    }
                }
            }
            resultMap
        } catch (e: Exception) {
            Log.w(TAG, "MediaStore query failed: ${e.message}")
            null
        }
    }
}
